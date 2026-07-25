/**
 * Model / Msg / update — the TypeScript port of the same three things in
 * `zero-native/src/core.zig`, with identical semantics:
 *
 *   - `update` is pure and exhaustively switched over `Msg`; it never
 *     mutates the model it is given, it returns the next one.
 *   - RSVP toggling keeps the design's rule: setting the status you
 *     already have clears it, setting the other one replaces it.
 *   - `open_event` remembers the tab to come `back` to, unless we are
 *     already in detail (in which case the earlier `prevTab` stands).
 *
 * The Zig core allocates each next model in a frame arena and commits it
 * into a two-space heap; here the next model is a plain object and the JS
 * GC does that job, so `rt.zig` has no counterpart in this tree.
 *
 * The one addition the Cloudflare backend forces is the sync messages
 * (`catalog_loaded` / `sync_failed` / `reload`). They stay pure — the
 * fetching itself lives in `src/api/sync.ts`, outside the loop.
 */
import { EMPTY_CATALOG } from './catalog';
import type { Cat, Catalog, FollowEntry, RsvpEntry, Tab, UserState } from './types';

/** Where the catalog on the Model came from. */
export type SyncSource = 'none' | 'cloudflare' | 'bundled';

export type Sync = {
  status: 'loading' | 'ready' | 'offline';
  source: SyncSource;
  /** Set when the Worker could not be reached; drives the offline notice. */
  error: string | null;
};

export type Model = {
  tab: Tab;
  prevTab: Tab;
  selectedId: number;
  mapSelId: number;
  cat: Cat;
  selectedDay: number;
  rsvps: RsvpEntry[];
  follows: FollowEntry[];
  catalog: Catalog;
  sync: Sync;
};

export type Msg =
  | { type: 'go_discover' }
  | { type: 'go_map' }
  | { type: 'go_calendar' }
  | { type: 'go_you' }
  | { type: 'open_event'; id: number }
  | { type: 'back' }
  | { type: 'pick_cat'; cat: Cat }
  | { type: 'pick_day'; day: number }
  | { type: 'pick_pin'; id: number }
  | { type: 'join_event'; id: number }
  | { type: 'toggle_going' }
  | { type: 'toggle_interested' }
  | { type: 'toggle_follow' }
  // --- sync (no counterpart in the Zero Native core) ---
  | { type: 'catalog_loaded'; catalog: Catalog; state: UserState; source: SyncSource }
  | { type: 'sync_failed'; error: string; catalog: Catalog }
  | { type: 'reload' };

/** `initialModel()` in core.zig, plus the pre-fetch sync state. */
export function initialModel(): Model {
  return {
    tab: 'discover',
    prevTab: 'discover',
    selectedId: 1,
    mapSelId: 2,
    cat: 'all',
    selectedDay: 21,
    rsvps: [],
    follows: [],
    catalog: EMPTY_CATALOG,
    sync: { status: 'loading', source: 'none', error: null },
  };
}

export function rsvpOf(model: Model, id: number): RsvpEntry['status'] {
  const entry = model.rsvps.find((r) => r.id === id);
  return entry ? entry.status : 'none';
}

export function followOf(model: Model, id: number): boolean {
  const entry = model.follows.find((f) => f.id === id);
  return entry ? entry.on : false;
}

/**
 * Toggle semantics from the design: setting the status you already have
 * clears it; setting the other one replaces it.
 */
function toggleRsvp(model: Model, id: number, status: RsvpEntry['status']): Model {
  const current = rsvpOf(model, id);
  const next: RsvpEntry['status'] = current === status ? 'none' : status;
  const known = model.rsvps.some((r) => r.id === id);
  const rsvps = known
    ? model.rsvps.map((r) => (r.id === id ? { id: r.id, status: next } : r))
    : [...model.rsvps, { id, status: next }];
  return { ...model, rsvps };
}

function toggleFollow(model: Model, id: number): Model {
  const known = model.follows.some((f) => f.id === id);
  const follows = known
    ? model.follows.map((f) => (f.id === id ? { id: f.id, on: !f.on } : f))
    : [...model.follows, { id, on: true }];
  return { ...model, follows };
}

export function update(model: Model, msg: Msg): Model {
  switch (msg.type) {
    case 'go_discover':
      return { ...model, tab: 'discover', prevTab: 'discover' };
    case 'go_map':
      return { ...model, tab: 'map', prevTab: 'map' };
    case 'go_calendar':
      return { ...model, tab: 'calendar', prevTab: 'calendar' };
    case 'go_you':
      return { ...model, tab: 'you', prevTab: 'you' };
    case 'open_event':
      return {
        ...model,
        tab: 'detail',
        selectedId: msg.id,
        prevTab: model.tab === 'detail' ? model.prevTab : model.tab,
      };
    case 'back':
      return { ...model, tab: model.prevTab };
    case 'pick_cat':
      return { ...model, cat: msg.cat };
    case 'pick_day':
      return { ...model, selectedDay: msg.day };
    case 'pick_pin':
      return { ...model, mapSelId: msg.id };
    case 'join_event':
      return toggleRsvp(model, msg.id, 'going');
    case 'toggle_going':
      return toggleRsvp(model, model.selectedId, 'going');
    case 'toggle_interested':
      return toggleRsvp(model, model.selectedId, 'interested');
    case 'toggle_follow':
      return toggleFollow(model, model.selectedId);

    case 'catalog_loaded':
      return {
        ...model,
        catalog: msg.catalog,
        rsvps: msg.state.rsvps,
        follows: msg.state.follows,
        sync: { status: 'ready', source: msg.source, error: null },
      };
    case 'sync_failed': {
      // A write that fails after the catalog loaded must not clobber it:
      // keep what we have and only fall back when we have nothing.
      const loaded = model.catalog.events.length > 0;
      return {
        ...model,
        catalog: loaded ? model.catalog : msg.catalog,
        sync: {
          status: 'offline',
          source: loaded ? model.sync.source : 'bundled',
          error: msg.error,
        },
      };
    }
    case 'reload':
      return { ...model, sync: { ...model.sync, status: 'loading', error: null } };
  }
}
