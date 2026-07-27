/**
 * The Pulse Events catalog — transcribed verbatim from the `EVENTS`,
 * `CATS`, `GROUPS` and `CHATS` tables in `zero-native/src/core.zig`.
 *
 * This module is the single source of truth for the seed data in three
 * places at once:
 *
 *   1. `server/scripts/generate-seed.ts` emits `server/seed.sql` from it,
 *      so what D1 stores is exactly what Zero Native compiles in.
 *   2. The app falls back to it when the Worker is unreachable, so the UI
 *      still renders offline (Zero Native has no network at all, so this
 *      keeps the two builds visually identical without a backend).
 *   3. The parity tests run the reducer against it.
 *
 * `DAY_NAMES`, `POOL` and the RSVP button labels stay here rather than in
 * D1 for the same reason they are `const` in core.zig: they are display
 * logic, not content.
 */
import type { CatInfo, Catalog, ChatRow, EventInfo, GroupRow } from './types';

export const EVENTS: EventInfo[] = [
  {
    id: 1,
    title: 'Neon Warehouse',
    venue: 'Basement Nine',
    area: 'Bushwick',
    day: 21,
    time: '11:00 PM',
    timeShort: '11:00',
    ampm: 'PM',
    cat: 'techno',
    catLabel: 'Techno',
    price: '$25',
    free: false,
    dist: '0.8 mi',
    att: 342,
    friends: 12,
    host: 'Maya Reyes',
    hostInit: 'MR',
    about:
      "Three rooms, two floors, one night. Bushwick's biggest warehouse rave returns with a raw industrial sound system and visuals until sunrise. 21+, dress to move.",
    pinLeft: 105,
    pinTop: 210,
    pinSize: 44,
  },
  {
    id: 2,
    title: 'Rooftop Sunset Sessions',
    venue: 'The Aerie',
    area: 'Williamsburg',
    day: 24,
    time: '6:30 PM',
    timeShort: '6:30',
    ampm: 'PM',
    cat: 'house',
    catLabel: 'Rooftop',
    price: '$15',
    free: false,
    dist: '1.2 mi',
    att: 128,
    friends: 10,
    host: 'Dev & Zoe',
    hostInit: 'DZ',
    about:
      'Golden-hour house music with skyline views. Natural wine bar, low-key sets, and the best sunset in Brooklyn. Come early - the roof fills fast.',
    pinLeft: 224,
    pinTop: 175,
    pinSize: 38,
  },
  {
    id: 3,
    title: 'Vinyl Nights: Disco',
    venue: 'Groove Room',
    area: 'Bushwick',
    day: 25,
    time: '10:00 PM',
    timeShort: '10:00',
    ampm: 'PM',
    cat: 'house',
    catLabel: 'House',
    price: 'Free',
    free: true,
    dist: '0.5 mi',
    att: 96,
    friends: 8,
    host: 'Kai Tran',
    hostInit: 'KT',
    about:
      'All vinyl, all disco, all night. A tight basement room, a wall of records, and no phones on the floor. Free entry before 11.',
    pinLeft: 161,
    pinTop: 330,
    pinSize: 36,
  },
  {
    id: 4,
    title: 'Afterhours: Deep Cuts',
    venue: 'Cellar 33',
    area: 'East Williamsburg',
    day: 22,
    time: '2:00 AM',
    timeShort: '2:00',
    ampm: 'AM',
    cat: 'techno',
    catLabel: 'Techno',
    price: '$20',
    free: false,
    dist: '2.0 mi',
    att: 210,
    friends: 12,
    host: 'Priya N.',
    hostInit: 'PN',
    about:
      'When everything else closes, this opens. Deep, hypnotic techno in a candle-lit cellar for the ones who never go home. Members + guests.',
    pinLeft: 266,
    pinTop: 350,
    pinSize: 40,
  },
  {
    id: 5,
    title: 'Y2K Throwback Rave',
    venue: 'Palace Hall',
    area: 'Ridgewood',
    day: 26,
    time: '9:00 PM',
    timeShort: '9:00',
    ampm: 'PM',
    cat: 'all',
    catLabel: 'Live',
    price: '$30',
    free: false,
    dist: '3.1 mi',
    att: 540,
    friends: 12,
    host: 'Leo M.',
    hostInit: 'LM',
    about:
      '2000s bangers, butterfly clips, and a giant disco ball. Full live PA, throwback visuals, and a costume contest at midnight. Dress the decade.',
    pinLeft: 63,
    pinTop: 375,
    pinSize: 42,
  },
  {
    id: 6,
    title: 'Backyard Beats & BBQ',
    venue: 'The Lot',
    area: 'Bushwick',
    day: 22,
    time: '4:00 PM',
    timeShort: '4:00',
    ampm: 'PM',
    cat: 'house',
    catLabel: 'House',
    price: 'Free',
    free: true,
    dist: '0.9 mi',
    att: 74,
    friends: 7,
    host: 'Nia B.',
    hostInit: 'NB',
    about:
      'Day party done right. Smoky grills, a garden sound system, and easy house grooves till sundown. Bring a friend, BYO good vibes.',
    pinLeft: 182,
    pinTop: 260,
    pinSize: 34,
  },
];

export const CATS: CatInfo[] = [
  { tag: 'all', label: 'All' },
  { tag: 'tonight', label: 'Tonight' },
  { tag: 'house', label: 'House' },
  { tag: 'techno', label: 'Techno' },
  { tag: 'free', label: 'Free' },
];

export const GROUPS: GroupRow[] = [
  { id: 1, init: 'BR', name: 'Bushwick Ravers', members: 1240, note: '3 events this week' },
  { id: 2, init: 'RC', name: 'Rooftop Crew', members: 86, note: 'New party Fri' },
  { id: 3, init: 'TH', name: 'Techno Heads', members: 512, note: '12 online now' },
  { id: 4, init: 'DP', name: 'Day Party Club', members: 203, note: 'Planning brunch' },
];

export const CHATS: ChatRow[] = [
  {
    id: 1,
    init: 'BR',
    name: 'Bushwick Ravers',
    last: "Maya: who's pre-gaming before Neon?",
    when: '2m',
    unread: 5,
    hasUnread: true,
  },
  {
    id: 2,
    init: 'RC',
    name: 'Rooftop Crew',
    last: 'Dev: got 4 tickets, need 2 more',
    when: '18m',
    unread: 2,
    hasUnread: true,
  },
  {
    id: 3,
    init: 'TH',
    name: 'Techno Heads',
    last: 'You: see everyone at Cellar 33',
    when: '1h',
    unread: 0,
    hasUnread: false,
  },
];

/** July 1, 2026 is a Wednesday: weekday(d) = DAY_NAMES[(2 + d) % 7]. */
export const DAY_NAMES: string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** The attendee-avatar initials pool the design cycles through. */
export const POOL: string[] = ['MR', 'DZ', 'KT', 'PA', 'LM', 'NB', 'JS'];

export const LABEL_JOIN = 'Join';
export const LABEL_GOING = 'Going';
export const LABEL_SAVED = 'Saved';

/** The bundled catalog, in the shape the Worker serves it. */
export const BUNDLED_CATALOG: Catalog = {
  events: EVENTS,
  cats: CATS,
  groups: GROUPS,
  chats: CHATS,
};

/** An empty catalog — the Model's value before the first fetch resolves. */
export const EMPTY_CATALOG: Catalog = { events: [], cats: [], groups: [], chats: [] };
