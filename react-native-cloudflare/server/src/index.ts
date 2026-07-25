/**
 * Pulse Events API — a Cloudflare Worker over D1.
 *
 * The Zero Native build has no backend at all: its catalog is `const` data
 * compiled into the binary and its RSVP state lives in the model heap for
 * as long as the process runs. This Worker is the same data, served from
 * D1, plus the one thing a server buys you — RSVP and follow state that
 * outlives the app.
 *
 * Routes:
 *   GET  /api/health    liveness + row counts
 *   GET  /api/bootstrap catalog + the caller's state, one round trip
 *   PUT  /api/rsvp      { eventId, status }  persist one RSVP
 *   PUT  /api/follow    { eventId, on }      persist one host follow
 *
 * The caller identifies itself with `x-pulse-user`. That is not
 * authentication and is not treated as any: see server/README.md.
 */

export type Env = {
  DB: D1Database;
};

type Cat = 'all' | 'tonight' | 'house' | 'techno' | 'free';
type Rsvp = 'none' | 'interested' | 'going';

const RSVP_VALUES: readonly Rsvp[] = ['none', 'interested', 'going'];

/** Matches the app's `USER_ID` convention; keep it conservative. */
const USER_PATTERN = /^[a-z0-9_-]{1,64}$/i;
const DEFAULT_USER = 'alexr';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

/**
 * Permissive CORS: the API serves a public read-only catalog and per-user
 * demo state, and Expo dev clients call it from an origin that changes
 * every run. Lock this down before putting anything real behind it.
 */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type, x-pulse-user',
  'access-control-max-age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS_HEADERS },
  });
}

function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

function userOf(request: Request): string | null {
  const raw = request.headers.get('x-pulse-user') ?? DEFAULT_USER;
  return USER_PATTERN.test(raw) ? raw : null;
}

// ---------------------------------------------------------------------------
// Row shapes, and the mapping back to the core's camelCase field names.

type EventRow = {
  id: number;
  title: string;
  venue: string;
  area: string;
  day: number;
  time: string;
  time_short: string;
  ampm: string;
  cat: string;
  cat_label: string;
  price: string;
  free: number;
  dist: string;
  att: number;
  friends: number;
  host: string;
  host_init: string;
  about: string;
  pin_left: number;
  pin_top: number;
  pin_size: number;
};

function toEvent(r: EventRow) {
  return {
    id: r.id,
    title: r.title,
    venue: r.venue,
    area: r.area,
    day: r.day,
    time: r.time,
    timeShort: r.time_short,
    ampm: r.ampm,
    cat: r.cat as Cat,
    catLabel: r.cat_label,
    price: r.price,
    free: r.free === 1,
    dist: r.dist,
    att: r.att,
    friends: r.friends,
    host: r.host,
    hostInit: r.host_init,
    about: r.about,
    pinLeft: r.pin_left,
    pinTop: r.pin_top,
    pinSize: r.pin_size,
  };
}

type ChatRow = {
  id: number;
  init: string;
  name: string;
  last: string;
  when: string;
  unread: number;
};

function toChat(r: ChatRow) {
  return {
    id: r.id,
    init: r.init,
    name: r.name,
    last: r.last,
    when: r.when,
    // Derived rather than stored: it is a function of `unread`, and the
    // core computes it the same way.
    unread: r.unread,
    hasUnread: r.unread > 0,
  };
}

// ---------------------------------------------------------------------------
// Handlers

async function bootstrap(env: Env, user: string): Promise<Response> {
  const [events, cats, groups, chats, rsvps, follows] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM events ORDER BY id'),
    env.DB.prepare('SELECT tag, label FROM categories ORDER BY sort'),
    env.DB.prepare('SELECT id, init, name, members, note FROM groups ORDER BY id'),
    env.DB.prepare('SELECT id, init, name, last, "when", unread FROM chats ORDER BY id'),
    env.DB.prepare('SELECT event_id, status FROM rsvps WHERE user_id = ? ORDER BY event_id').bind(
      user,
    ),
    env.DB.prepare(
      'SELECT event_id, following FROM follows WHERE user_id = ? ORDER BY event_id',
    ).bind(user),
  ]);

  return json({
    catalog: {
      events: (events.results as EventRow[]).map(toEvent),
      cats: cats.results as { tag: Cat; label: string }[],
      groups: groups.results,
      chats: (chats.results as ChatRow[]).map(toChat),
    },
    state: {
      rsvps: (rsvps.results as { event_id: number; status: string }[]).map((r) => ({
        id: r.event_id,
        status: r.status as Rsvp,
      })),
      follows: (follows.results as { event_id: number; following: number }[]).map((f) => ({
        id: f.event_id,
        on: f.following === 1,
      })),
    },
  });
}

async function saveRsvp(request: Request, env: Env, user: string): Promise<Response> {
  let body: { eventId?: unknown; status?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('body must be JSON', 400);
  }

  const eventId = Number(body.eventId);
  const status = body.status;
  if (!Number.isInteger(eventId)) return fail('eventId must be an integer', 400);
  if (typeof status !== 'string' || !RSVP_VALUES.includes(status as Rsvp)) {
    return fail(`status must be one of ${RSVP_VALUES.join(', ')}`, 400);
  }

  const known = await env.DB.prepare('SELECT 1 FROM events WHERE id = ?').bind(eventId).first();
  if (!known) return fail(`no event ${eventId}`, 404);

  await env.DB.prepare(
    `INSERT INTO rsvps (user_id, event_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, event_id)
     DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
  )
    .bind(user, eventId, status, Date.now())
    .run();

  return json({ ok: true });
}

async function saveFollow(request: Request, env: Env, user: string): Promise<Response> {
  let body: { eventId?: unknown; on?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail('body must be JSON', 400);
  }

  const eventId = Number(body.eventId);
  const on = body.on;
  if (!Number.isInteger(eventId)) return fail('eventId must be an integer', 400);
  if (typeof on !== 'boolean') return fail('on must be a boolean', 400);

  const known = await env.DB.prepare('SELECT 1 FROM events WHERE id = ?').bind(eventId).first();
  if (!known) return fail(`no event ${eventId}`, 404);

  await env.DB.prepare(
    `INSERT INTO follows (user_id, event_id, following, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, event_id)
     DO UPDATE SET following = excluded.following, updated_at = excluded.updated_at`,
  )
    .bind(user, eventId, on ? 1 : 0, Date.now())
    .run();

  return json({ ok: true });
}

async function health(env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM events)     AS events,
            (SELECT COUNT(*) FROM categories) AS cats,
            (SELECT COUNT(*) FROM groups)     AS groups,
            (SELECT COUNT(*) FROM chats)      AS chats`,
  ).first();
  return json({ ok: true, counts: row });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const user = userOf(request);
    if (!user) return fail('x-pulse-user must match /^[a-z0-9_-]{1,64}$/i', 400);

    try {
      if (request.method === 'GET' && (path === '/api/health' || path === '/')) {
        return await health(env);
      }
      if (request.method === 'GET' && path === '/api/bootstrap') {
        return await bootstrap(env, user);
      }
      if (request.method === 'PUT' && path === '/api/rsvp') {
        return await saveRsvp(request, env, user);
      }
      if (request.method === 'PUT' && path === '/api/follow') {
        return await saveFollow(request, env, user);
      }
      return fail(`no route for ${request.method} ${path}`, 404);
    } catch (err) {
      console.error('unhandled', err);
      return fail(err instanceof Error ? err.message : 'internal error', 500);
    }
  },
} satisfies ExportedHandler<Env>;
