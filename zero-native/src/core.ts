// Pulse Events — app core.
//
// The logic tier of the Pulse Events nightlife app (from the claude.ai/design
// "Pulse Events" mock): a static six-event catalog, tab navigation with a
// detail push, category filtering, a July 2026 calendar, per-event RSVP
// state, and host follows. Pure Model/Msg/update in the @native-sdk/core
// TypeScript subset — no effects, no subscriptions.

import { asciiBytes } from "@native-sdk/core";

export type Bytes = Uint8Array;

export type Tab = "discover" | "map" | "calendar" | "you" | "detail";
export type Cat = "all" | "tonight" | "house" | "techno" | "free";
export type Rsvp = "none" | "interested" | "going";

// ---------------------------------------------------------------------------
// Catalog (const tables — rodata, shared for free at commit)

export interface EventInfo {
  readonly id: number;
  readonly title: Bytes;
  readonly venue: Bytes;
  readonly area: Bytes;
  readonly day: number; // July 2026 date
  readonly time: Bytes; // "11:00 PM"
  readonly timeShort: Bytes; // "11:00"
  readonly ampm: Bytes; // "PM"
  readonly cat: Cat;
  readonly catLabel: Bytes;
  readonly price: Bytes;
  readonly free: boolean;
  readonly dist: Bytes;
  readonly att: number;
  readonly friends: number;
  readonly host: Bytes;
  readonly hostInit: Bytes;
  readonly about: Bytes;
  readonly pinLeft: number; // map pin position, points from the map's left
  readonly pinTop: number; // points from the map's top
  readonly pinSize: number;
}

const EVENTS: readonly EventInfo[] = [
  {
    id: 1,
    title: asciiBytes("Neon Warehouse"),
    venue: asciiBytes("Basement Nine"),
    area: asciiBytes("Bushwick"),
    day: 21,
    time: asciiBytes("11:00 PM"),
    timeShort: asciiBytes("11:00"),
    ampm: asciiBytes("PM"),
    cat: "techno",
    catLabel: asciiBytes("Techno"),
    price: asciiBytes("$25"),
    free: false,
    dist: asciiBytes("0.8 mi"),
    att: 342,
    friends: 12,
    host: asciiBytes("Maya Reyes"),
    hostInit: asciiBytes("MR"),
    about: asciiBytes(
      "Three rooms, two floors, one night. Bushwick's biggest warehouse rave returns with a raw industrial sound system and visuals until sunrise. 21+, dress to move.",
    ),
    pinLeft: 105,
    pinTop: 210,
    pinSize: 44,
  },
  {
    id: 2,
    title: asciiBytes("Rooftop Sunset Sessions"),
    venue: asciiBytes("The Aerie"),
    area: asciiBytes("Williamsburg"),
    day: 24,
    time: asciiBytes("6:30 PM"),
    timeShort: asciiBytes("6:30"),
    ampm: asciiBytes("PM"),
    cat: "house",
    catLabel: asciiBytes("Rooftop"),
    price: asciiBytes("$15"),
    free: false,
    dist: asciiBytes("1.2 mi"),
    att: 128,
    friends: 10,
    host: asciiBytes("Dev & Zoe"),
    hostInit: asciiBytes("DZ"),
    about: asciiBytes(
      "Golden-hour house music with skyline views. Natural wine bar, low-key sets, and the best sunset in Brooklyn. Come early - the roof fills fast.",
    ),
    pinLeft: 224,
    pinTop: 175,
    pinSize: 38,
  },
  {
    id: 3,
    title: asciiBytes("Vinyl Nights: Disco"),
    venue: asciiBytes("Groove Room"),
    area: asciiBytes("Bushwick"),
    day: 25,
    time: asciiBytes("10:00 PM"),
    timeShort: asciiBytes("10:00"),
    ampm: asciiBytes("PM"),
    cat: "house",
    catLabel: asciiBytes("House"),
    price: asciiBytes("Free"),
    free: true,
    dist: asciiBytes("0.5 mi"),
    att: 96,
    friends: 8,
    host: asciiBytes("Kai Tran"),
    hostInit: asciiBytes("KT"),
    about: asciiBytes(
      "All vinyl, all disco, all night. A tight basement room, a wall of records, and no phones on the floor. Free entry before 11.",
    ),
    pinLeft: 161,
    pinTop: 330,
    pinSize: 36,
  },
  {
    id: 4,
    title: asciiBytes("Afterhours: Deep Cuts"),
    venue: asciiBytes("Cellar 33"),
    area: asciiBytes("East Williamsburg"),
    day: 22,
    time: asciiBytes("2:00 AM"),
    timeShort: asciiBytes("2:00"),
    ampm: asciiBytes("AM"),
    cat: "techno",
    catLabel: asciiBytes("Techno"),
    price: asciiBytes("$20"),
    free: false,
    dist: asciiBytes("2.0 mi"),
    att: 210,
    friends: 12,
    host: asciiBytes("Priya N."),
    hostInit: asciiBytes("PN"),
    about: asciiBytes(
      "When everything else closes, this opens. Deep, hypnotic techno in a candle-lit cellar for the ones who never go home. Members + guests.",
    ),
    pinLeft: 266,
    pinTop: 350,
    pinSize: 40,
  },
  {
    id: 5,
    title: asciiBytes("Y2K Throwback Rave"),
    venue: asciiBytes("Palace Hall"),
    area: asciiBytes("Ridgewood"),
    day: 26,
    time: asciiBytes("9:00 PM"),
    timeShort: asciiBytes("9:00"),
    ampm: asciiBytes("PM"),
    cat: "all",
    catLabel: asciiBytes("Live"),
    price: asciiBytes("$30"),
    free: false,
    dist: asciiBytes("3.1 mi"),
    att: 540,
    friends: 12,
    host: asciiBytes("Leo M."),
    hostInit: asciiBytes("LM"),
    about: asciiBytes(
      "2000s bangers, butterfly clips, and a giant disco ball. Full live PA, throwback visuals, and a costume contest at midnight. Dress the decade.",
    ),
    pinLeft: 63,
    pinTop: 375,
    pinSize: 42,
  },
  {
    id: 6,
    title: asciiBytes("Backyard Beats & BBQ"),
    venue: asciiBytes("The Lot"),
    area: asciiBytes("Bushwick"),
    day: 22,
    time: asciiBytes("4:00 PM"),
    timeShort: asciiBytes("4:00"),
    ampm: asciiBytes("PM"),
    cat: "house",
    catLabel: asciiBytes("House"),
    price: asciiBytes("Free"),
    free: true,
    dist: asciiBytes("0.9 mi"),
    att: 74,
    friends: 7,
    host: asciiBytes("Nia B."),
    hostInit: asciiBytes("NB"),
    about: asciiBytes(
      "Day party done right. Smoky grills, a garden sound system, and easy house grooves till sundown. Bring a friend, BYO good vibes.",
    ),
    pinLeft: 182,
    pinTop: 260,
    pinSize: 34,
  },
];

interface CatInfo {
  readonly tag: Cat;
  readonly label: Bytes;
}

const CATS: readonly CatInfo[] = [
  { tag: "all", label: asciiBytes("All") },
  { tag: "tonight", label: asciiBytes("Tonight") },
  { tag: "house", label: asciiBytes("House") },
  { tag: "techno", label: asciiBytes("Techno") },
  { tag: "free", label: asciiBytes("Free") },
];

interface DayName {
  readonly name: Bytes;
}

// July 1, 2026 is a Wednesday: weekday(d) = DAY_NAMES[(2 + d) % 7].
const DAY_NAMES: readonly DayName[] = [
  { name: asciiBytes("Sunday") },
  { name: asciiBytes("Monday") },
  { name: asciiBytes("Tuesday") },
  { name: asciiBytes("Wednesday") },
  { name: asciiBytes("Thursday") },
  { name: asciiBytes("Friday") },
  { name: asciiBytes("Saturday") },
];

interface PoolInitials {
  readonly init: Bytes;
}

// The attendee-avatar initials pool the design cycles through.
const POOL: readonly PoolInitials[] = [
  { init: asciiBytes("MR") },
  { init: asciiBytes("DZ") },
  { init: asciiBytes("KT") },
  { init: asciiBytes("PA") },
  { init: asciiBytes("LM") },
  { init: asciiBytes("NB") },
  { init: asciiBytes("JS") },
];

export interface GroupRow {
  readonly id: number;
  readonly init: Bytes;
  readonly name: Bytes;
  readonly members: number;
  readonly note: Bytes;
}

const GROUPS: readonly GroupRow[] = [
  { id: 1, init: asciiBytes("BR"), name: asciiBytes("Bushwick Ravers"), members: 1240, note: asciiBytes("3 events this week") },
  { id: 2, init: asciiBytes("RC"), name: asciiBytes("Rooftop Crew"), members: 86, note: asciiBytes("New party Fri") },
  { id: 3, init: asciiBytes("TH"), name: asciiBytes("Techno Heads"), members: 512, note: asciiBytes("12 online now") },
  { id: 4, init: asciiBytes("DP"), name: asciiBytes("Day Party Club"), members: 203, note: asciiBytes("Planning brunch") },
];

export interface ChatRow {
  readonly id: number;
  readonly init: Bytes;
  readonly name: Bytes;
  readonly last: Bytes;
  readonly when: Bytes;
  readonly unread: number;
  readonly hasUnread: boolean;
}

const CHATS: readonly ChatRow[] = [
  {
    id: 1,
    init: asciiBytes("BR"),
    name: asciiBytes("Bushwick Ravers"),
    last: asciiBytes("Maya: who's pre-gaming before Neon?"),
    when: asciiBytes("2m"),
    unread: 5,
    hasUnread: true,
  },
  {
    id: 2,
    init: asciiBytes("RC"),
    name: asciiBytes("Rooftop Crew"),
    last: asciiBytes("Dev: got 4 tickets, need 2 more"),
    when: asciiBytes("18m"),
    unread: 2,
    hasUnread: true,
  },
  {
    id: 3,
    init: asciiBytes("TH"),
    name: asciiBytes("Techno Heads"),
    last: asciiBytes("You: see everyone at Cellar 33"),
    when: asciiBytes("1h"),
    unread: 0,
    hasUnread: false,
  },
];

const LABEL_JOIN = asciiBytes("Join");
const LABEL_GOING = asciiBytes("Going");
const LABEL_SAVED = asciiBytes("Saved");

// ---------------------------------------------------------------------------
// Model

export interface RsvpEntry {
  readonly id: number;
  readonly status: Rsvp;
}

export interface FollowEntry {
  readonly id: number;
  readonly on: boolean;
}

export interface Model {
  readonly tab: Tab;
  readonly prevTab: Tab;
  readonly selectedId: number;
  readonly mapSelId: number;
  readonly cat: Cat;
  readonly selectedDay: number;
  readonly rsvps: readonly RsvpEntry[];
  readonly follows: readonly FollowEntry[];
}

export function initialModel(): Model {
  return {
    tab: "discover",
    prevTab: "discover",
    selectedId: 1,
    mapSelId: 2,
    cat: "all",
    selectedDay: 21,
    rsvps: [],
    follows: [],
  };
}

// Update-only state nothing in markup binds directly (helpers derive from it).
export const viewUnbound = ["tab", "prevTab", "selectedId", "cat", "rsvps", "follows"] as const;

// ---------------------------------------------------------------------------
// Msg + update

export type Msg =
  | { readonly kind: "go_discover" }
  | { readonly kind: "go_map" }
  | { readonly kind: "go_calendar" }
  | { readonly kind: "go_you" }
  | { readonly kind: "open_event"; readonly id: number }
  | { readonly kind: "back" }
  | { readonly kind: "pick_cat"; readonly cat: Cat }
  | { readonly kind: "pick_day"; readonly day: number }
  | { readonly kind: "pick_pin"; readonly id: number }
  | { readonly kind: "join_event"; readonly id: number }
  | { readonly kind: "toggle_going" }
  | { readonly kind: "toggle_interested" }
  | { readonly kind: "toggle_follow" };

function eventById(id: number): EventInfo {
  return EVENTS.find((e) => e.id === id) ?? EVENTS[0];
}

function rsvpOf(model: Model, id: number): Rsvp {
  const entry = model.rsvps.find((r) => r.id === id);
  return entry === undefined ? "none" : entry.status;
}

// Toggle semantics from the design: setting the status you already have
// clears it; setting the other one replaces it.
function toggleRsvp(model: Model, id: number, status: Rsvp): Model {
  const current = rsvpOf(model, id);
  const next: Rsvp = current === status ? "none" : status;
  const existing = model.rsvps.find((r) => r.id === id);
  if (existing === undefined) {
    const rsvps: readonly RsvpEntry[] = [...model.rsvps, { id: id, status: next }];
    return { ...model, rsvps: rsvps };
  }
  return {
    ...model,
    rsvps: model.rsvps.map((r) => (r.id === id ? { id: r.id, status: next } : r)),
  };
}

function followOf(model: Model, id: number): boolean {
  const entry = model.follows.find((f) => f.id === id);
  return entry === undefined ? false : entry.on;
}

export function update(model: Model, msg: Msg): Model {
  switch (msg.kind) {
    case "go_discover":
      return { ...model, tab: "discover", prevTab: "discover" };
    case "go_map":
      return { ...model, tab: "map", prevTab: "map" };
    case "go_calendar":
      return { ...model, tab: "calendar", prevTab: "calendar" };
    case "go_you":
      return { ...model, tab: "you", prevTab: "you" };
    case "open_event":
      return {
        ...model,
        tab: "detail",
        selectedId: msg.id,
        prevTab: model.tab === "detail" ? model.prevTab : model.tab,
      };
    case "back":
      return { ...model, tab: model.prevTab };
    case "pick_cat":
      return { ...model, cat: msg.cat };
    case "pick_day":
      return { ...model, selectedDay: msg.day };
    case "pick_pin":
      return { ...model, mapSelId: msg.id };
    case "join_event":
      return toggleRsvp(model, msg.id, "going");
    case "toggle_going":
      return toggleRsvp(model, model.selectedId, "going");
    case "toggle_interested":
      return toggleRsvp(model, model.selectedId, "interested");
    case "toggle_follow": {
      const id = model.selectedId;
      const existing = model.follows.find((f) => f.id === id);
      if (existing === undefined) {
        const follows: readonly FollowEntry[] = [...model.follows, { id: id, on: true }];
        return { ...model, follows: follows };
      }
      return {
        ...model,
        follows: model.follows.map((f) => (f.id === id ? { id: f.id, on: !f.on } : f)),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Screen flags

export function isDiscover(model: Model): boolean {
  return model.tab === "discover";
}
export function isMap(model: Model): boolean {
  return model.tab === "map";
}
export function isCalendar(model: Model): boolean {
  return model.tab === "calendar";
}
export function isYou(model: Model): boolean {
  return model.tab === "you";
}
export function isDetail(model: Model): boolean {
  return model.tab === "detail";
}
export function showTabbar(model: Model): boolean {
  return model.tab !== "detail";
}

// ---------------------------------------------------------------------------
// Discover

export interface CatRowView {
  readonly tag: Cat;
  readonly label: Bytes;
  readonly active: boolean;
}

export function catRows(model: Model): readonly CatRowView[] {
  return CATS.map((c) => ({ tag: c.tag, label: c.label, active: c.tag === model.cat }));
}

export interface FeedRow {
  readonly id: number;
  readonly day: number;
  readonly title: Bytes;
  readonly venue: Bytes;
  readonly dist: Bytes;
  readonly price: Bytes;
  readonly att: number;
  readonly statusLabel: Bytes;
  readonly joined: boolean;
}

function matchesCat(e: EventInfo, cat: Cat): boolean {
  if (cat === "all") return true;
  if (cat === "tonight") return e.day === 21;
  if (cat === "free") return e.free;
  return e.cat === cat;
}

export function feedRows(model: Model): readonly FeedRow[] {
  return EVENTS.filter((e) => matchesCat(e, model.cat)).map((e) => {
    const status = rsvpOf(model, e.id);
    return {
      id: e.id,
      day: e.day,
      title: e.title,
      venue: e.venue,
      dist: e.dist,
      price: e.price,
      att: e.att,
      statusLabel: status === "going" ? LABEL_GOING : status === "interested" ? LABEL_SAVED : LABEL_JOIN,
      joined: status === "going",
    };
  });
}

export function featuredId(model: Model): number {
  return EVENTS[0].id;
}
export function featuredTitle(model: Model): Bytes {
  return EVENTS[0].title;
}
export function featuredVenue(model: Model): Bytes {
  return EVENTS[0].venue;
}
export function featuredTime(model: Model): Bytes {
  return EVENTS[0].time;
}
export function featuredAtt(model: Model): number {
  return EVENTS[0].att;
}

// ---------------------------------------------------------------------------
// Map

export interface MapPin {
  readonly id: number;
  readonly title: Bytes;
  readonly left: number;
  readonly top: number;
  readonly size: number;
  readonly selected: boolean;
}

export function mapPins(model: Model): readonly MapPin[] {
  return EVENTS.map((e) => ({
    id: e.id,
    title: e.title,
    left: e.pinLeft,
    top: e.pinTop,
    size: e.id === model.mapSelId ? 52 : e.pinSize,
    selected: e.id === model.mapSelId,
  }));
}

export interface MapCard {
  readonly id: number;
  readonly title: Bytes;
  readonly time: Bytes;
  readonly dist: Bytes;
}

export function mapCards(model: Model): readonly MapCard[] {
  return EVENTS.slice(0, 2).map((e) => ({ id: e.id, title: e.title, time: e.time, dist: e.dist }));
}

export function mapCount(model: Model): number {
  return EVENTS.length;
}
export function mapSelTitle(model: Model): Bytes {
  return eventById(model.mapSelId).title;
}
export function mapSelVenue(model: Model): Bytes {
  return eventById(model.mapSelId).venue;
}
export function mapSelDist(model: Model): Bytes {
  return eventById(model.mapSelId).dist;
}
export function mapSelTime(model: Model): Bytes {
  return eventById(model.mapSelId).time;
}
export function mapSelAtt(model: Model): number {
  return eventById(model.mapSelId).att;
}

// ---------------------------------------------------------------------------
// Calendar

export interface CalCell {
  readonly key: number;
  readonly day: number;
  readonly blank: boolean;
  readonly selected: boolean;
  readonly dot: boolean;
}

export function calCells(model: Model): readonly CalCell[] {
  const cells: CalCell[] = [];
  for (let i = 0; i < 3; i++) {
    cells.push({ key: i, day: 0, blank: true, selected: false, dot: false });
  }
  for (let d = 1; d <= 31; d++) {
    const sel = d === model.selectedDay;
    const has = EVENTS.some((e) => e.day === d);
    cells.push({ key: 3 + d, day: d, blank: false, selected: sel, dot: has && !sel });
  }
  cells.push({ key: 40, day: 0, blank: true, selected: false, dot: false });
  return cells;
}

export function selectedDayName(model: Model): Bytes {
  return DAY_NAMES[(2 + model.selectedDay) % 7].name;
}

export interface DayRow {
  readonly id: number;
  readonly timeShort: Bytes;
  readonly ampm: Bytes;
  readonly title: Bytes;
  readonly venue: Bytes;
  readonly dist: Bytes;
  readonly att: number;
  readonly i1: Bytes;
  readonly i2: Bytes;
  readonly i3: Bytes;
}

export function dayRows(model: Model): readonly DayRow[] {
  return EVENTS.filter((e) => e.day === model.selectedDay).map((e) => ({
    id: e.id,
    timeShort: e.timeShort,
    ampm: e.ampm,
    title: e.title,
    venue: e.venue,
    dist: e.dist,
    att: e.att,
    i1: POOL[e.id % 7].init,
    i2: POOL[(e.id + 1) % 7].init,
    i3: POOL[(e.id + 2) % 7].init,
  }));
}

export function hasDayEvents(model: Model): boolean {
  return EVENTS.some((e) => e.day === model.selectedDay);
}
export function noDayEvents(model: Model): boolean {
  return !EVENTS.some((e) => e.day === model.selectedDay);
}

// ---------------------------------------------------------------------------
// You

export function groupRows(model: Model): readonly GroupRow[] {
  return GROUPS;
}
export function chatRows(model: Model): readonly ChatRow[] {
  return CHATS;
}

// ---------------------------------------------------------------------------
// Detail

export function selTitle(model: Model): Bytes {
  return eventById(model.selectedId).title;
}
export function selCatLabel(model: Model): Bytes {
  return eventById(model.selectedId).catLabel;
}
export function selVenue(model: Model): Bytes {
  return eventById(model.selectedId).venue;
}
export function selArea(model: Model): Bytes {
  return eventById(model.selectedId).area;
}
export function selDist(model: Model): Bytes {
  return eventById(model.selectedId).dist;
}
export function selTime(model: Model): Bytes {
  return eventById(model.selectedId).time;
}
export function selDateNum(model: Model): number {
  return eventById(model.selectedId).day;
}
export function selDayName(model: Model): Bytes {
  return DAY_NAMES[(2 + eventById(model.selectedId).day) % 7].name;
}
export function selHost(model: Model): Bytes {
  return eventById(model.selectedId).host;
}
export function selHostInit(model: Model): Bytes {
  return eventById(model.selectedId).hostInit;
}
export function selAbout(model: Model): Bytes {
  return eventById(model.selectedId).about;
}
export function selAtt(model: Model): number {
  return eventById(model.selectedId).att;
}
export function selFriends(model: Model): number {
  return eventById(model.selectedId).friends;
}
export function selOthers(model: Model): number {
  const e = eventById(model.selectedId);
  return e.att - e.friends;
}
export function selGoing(model: Model): boolean {
  return rsvpOf(model, model.selectedId) === "going";
}
export function selInterested(model: Model): boolean {
  return rsvpOf(model, model.selectedId) === "interested";
}
export function selFollowed(model: Model): boolean {
  return followOf(model, model.selectedId);
}
