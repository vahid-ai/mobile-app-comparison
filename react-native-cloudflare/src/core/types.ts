/**
 * Core types — the TypeScript restatement of the enums and catalog record
 * shapes in `zero-native/src/core.zig`.
 *
 * Zero Native keeps the catalog in `const` tables (rodata, shared for free
 * at commit). Here the same tables live in D1 and arrive over the Worker
 * API, so they are a value on the Model rather than a module constant —
 * that is the one structural difference the backend forces.
 */

/** `Tab` in core.zig — `detail` is a tab so `showTabbar` can hide the bar. */
export type Tab = 'discover' | 'map' | 'calendar' | 'you' | 'detail';

/** `Cat` in core.zig. */
export type Cat = 'all' | 'tonight' | 'house' | 'techno' | 'free';

/** `Rsvp` in core.zig. */
export type Rsvp = 'none' | 'interested' | 'going';

/** `EventInfo` in core.zig. */
export type EventInfo = {
  id: number;
  title: string;
  venue: string;
  area: string;
  day: number;
  time: string;
  timeShort: string;
  ampm: string;
  cat: Cat;
  catLabel: string;
  price: string;
  free: boolean;
  dist: string;
  att: number;
  friends: number;
  host: string;
  hostInit: string;
  about: string;
  pinLeft: number;
  pinTop: number;
  pinSize: number;
};

/** `CatInfo` in core.zig. */
export type CatInfo = {
  tag: Cat;
  label: string;
};

/** `GroupRow` in core.zig. */
export type GroupRow = {
  id: number;
  init: string;
  name: string;
  members: number;
  note: string;
};

/** `ChatRow` in core.zig. */
export type ChatRow = {
  id: number;
  init: string;
  name: string;
  last: string;
  when: string;
  unread: number;
  hasUnread: boolean;
};

/** `RsvpEntry` in core.zig. */
export type RsvpEntry = {
  id: number;
  status: Rsvp;
};

/** `FollowEntry` in core.zig. */
export type FollowEntry = {
  id: number;
  on: boolean;
};

/** Everything the Worker serves from D1 in one payload. */
export type Catalog = {
  events: EventInfo[];
  cats: CatInfo[];
  groups: GroupRow[];
  chats: ChatRow[];
};

/** The per-user mutable state D1 persists alongside the catalog. */
export type UserState = {
  rsvps: RsvpEntry[];
  follows: FollowEntry[];
};
