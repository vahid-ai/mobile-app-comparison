/**
 * The Cloudflare Worker client.
 *
 * The Worker (see `server/`) serves the catalog out of D1 and persists the
 * per-user RSVP and follow state there. Everything is plain JSON over
 * `fetch`; there is no SDK and no auth beyond the user id header, which is
 * all this app needs (see `server/README.md` for why, and what would have
 * to change for real accounts).
 */
import type { Catalog, Rsvp, UserState } from '../core/types';

/**
 * Set `EXPO_PUBLIC_PULSE_API` in `.env` to your deployed Worker origin.
 * Expo inlines `EXPO_PUBLIC_*` at bundle time; when it is unset the app
 * runs off the bundled catalog and shows the offline notice.
 */
export const API_BASE = (process.env.EXPO_PUBLIC_PULSE_API ?? '').replace(/\/+$/, '');

/** The signed-in user. Single-user demo, matching the design's profile. */
export const USER_ID = 'alexr';

/** Fail fast rather than hanging the splash on a dead origin. */
const TIMEOUT_MS = 8000;

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new ApiError('EXPO_PUBLIC_PULSE_API is not set');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-pulse-user': USER_ID,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new ApiError(`${init?.method ?? 'GET'} ${path} -> ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`${path} timed out after ${TIMEOUT_MS}ms`);
    }
    throw new ApiError(err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

/** `GET /api/bootstrap` — catalog + this user's state in one round trip. */
export function fetchBootstrap(): Promise<{ catalog: Catalog; state: UserState }> {
  return request<{ catalog: Catalog; state: UserState }>('/api/bootstrap');
}

/** `PUT /api/rsvp` — persist one RSVP; returns the row the server stored. */
export function putRsvp(eventId: number, status: Rsvp): Promise<{ ok: true }> {
  return request<{ ok: true }>('/api/rsvp', {
    method: 'PUT',
    body: JSON.stringify({ eventId, status }),
  });
}

/** `PUT /api/follow` — persist one host follow. */
export function putFollow(eventId: number, on: boolean): Promise<{ ok: true }> {
  return request<{ ok: true }>('/api/follow', {
    method: 'PUT',
    body: JSON.stringify({ eventId, on }),
  });
}
