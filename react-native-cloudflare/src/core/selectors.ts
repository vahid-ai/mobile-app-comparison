/**
 * Derived views of the Model — the port of every helper the Zero Native
 * markup binds by name (`isDiscover`, `feedRows`, `calCells`, `mapPins`,
 * `dayRows`, the `sel*` family). Same names, same semantics, same
 * derivations; the JSX below reads them exactly where `app.native` reads
 * its bindings.
 *
 * Nothing here mutates the Model, and nothing caches: like the Zig core,
 * each screen build recomputes what it shows.
 */
import { DAY_NAMES, LABEL_GOING, LABEL_JOIN, LABEL_SAVED, POOL } from './catalog';
import { followOf, rsvpOf, type Model } from './model';
import type { Cat, ChatRow, EventInfo, GroupRow } from './types';

/**
 * `eventById` in core.zig falls back to `EVENTS[0]`; the catalog can also
 * be empty here (before the first fetch resolves), so there is one more
 * fallback behind it. Nothing renders from it — the screens are gated on
 * `sync.status` — but it keeps every `sel*` helper total.
 */
const PLACEHOLDER_EVENT: EventInfo = {
  id: 0,
  title: '',
  venue: '',
  area: '',
  day: 1,
  time: '',
  timeShort: '',
  ampm: '',
  cat: 'all',
  catLabel: '',
  price: '',
  free: false,
  dist: '',
  att: 0,
  friends: 0,
  host: '',
  hostInit: '',
  about: '',
  pinLeft: 0,
  pinTop: 0,
  pinSize: 0,
};

function eventById(model: Model, id: number): EventInfo {
  return model.catalog.events.find((e) => e.id === id) ?? model.catalog.events[0] ?? PLACEHOLDER_EVENT;
}

function featured(model: Model): EventInfo {
  return model.catalog.events[0] ?? PLACEHOLDER_EVENT;
}

// ---------------------------------------------------------------------------
// Screen flags

export const isDiscover = (m: Model): boolean => m.tab === 'discover';
export const isMap = (m: Model): boolean => m.tab === 'map';
export const isCalendar = (m: Model): boolean => m.tab === 'calendar';
export const isYou = (m: Model): boolean => m.tab === 'you';
export const isDetail = (m: Model): boolean => m.tab === 'detail';
export const showTabbar = (m: Model): boolean => m.tab !== 'detail';

// ---------------------------------------------------------------------------
// Discover

export type CatRowView = {
  tag: Cat;
  label: string;
  active: boolean;
};

export function catRows(m: Model): CatRowView[] {
  return m.catalog.cats.map((c) => ({ tag: c.tag, label: c.label, active: c.tag === m.cat }));
}

export type FeedRow = {
  id: number;
  day: number;
  title: string;
  venue: string;
  dist: string;
  price: string;
  att: number;
  statusLabel: string;
  joined: boolean;
};

function matchesCat(e: EventInfo, cat: Cat): boolean {
  if (cat === 'all') return true;
  if (cat === 'tonight') return e.day === 21;
  if (cat === 'free') return e.free;
  return e.cat === cat;
}

export function feedRows(m: Model): FeedRow[] {
  return m.catalog.events
    .filter((e) => matchesCat(e, m.cat))
    .map((e) => {
      const status = rsvpOf(m, e.id);
      return {
        id: e.id,
        day: e.day,
        title: e.title,
        venue: e.venue,
        dist: e.dist,
        price: e.price,
        att: e.att,
        statusLabel:
          status === 'going' ? LABEL_GOING : status === 'interested' ? LABEL_SAVED : LABEL_JOIN,
        joined: status === 'going',
      };
    });
}

export const featuredId = (m: Model): number => featured(m).id;
export const featuredTitle = (m: Model): string => featured(m).title;
export const featuredVenue = (m: Model): string => featured(m).venue;
export const featuredTime = (m: Model): string => featured(m).time;
export const featuredAtt = (m: Model): number => featured(m).att;

// ---------------------------------------------------------------------------
// Map

export type MapPin = {
  id: number;
  title: string;
  left: number;
  top: number;
  size: number;
  selected: boolean;
};

export function mapPins(m: Model): MapPin[] {
  return m.catalog.events.map((e) => ({
    id: e.id,
    title: e.title,
    left: e.pinLeft,
    top: e.pinTop,
    size: e.id === m.mapSelId ? 52 : e.pinSize,
    selected: e.id === m.mapSelId,
  }));
}

export type MapCard = {
  id: number;
  title: string;
  time: string;
  dist: string;
};

export function mapCards(m: Model): MapCard[] {
  return m.catalog.events
    .slice(0, 2)
    .map((e) => ({ id: e.id, title: e.title, time: e.time, dist: e.dist }));
}

export const mapCount = (m: Model): number => m.catalog.events.length;
export const mapSelTitle = (m: Model): string => eventById(m, m.mapSelId).title;
export const mapSelVenue = (m: Model): string => eventById(m, m.mapSelId).venue;
export const mapSelDist = (m: Model): string => eventById(m, m.mapSelId).dist;
export const mapSelTime = (m: Model): string => eventById(m, m.mapSelId).time;
export const mapSelAtt = (m: Model): number => eventById(m, m.mapSelId).att;

// ---------------------------------------------------------------------------
// Calendar

export type CalCell = {
  key: number;
  day: number;
  blank: boolean;
  selected: boolean;
  dot: boolean;
  label: string;
};

/**
 * July 2026: three leading blanks (the 1st is a Wednesday), 31 days, one
 * trailing blank — 35 cells, five clean rows of seven. Keys match the Zig
 * core's so the two trees agree cell for cell.
 */
export function calCells(m: Model): CalCell[] {
  const cells: CalCell[] = [];
  for (let i = 0; i < 3; i += 1) {
    cells.push({ key: i, day: 0, blank: true, selected: false, dot: false, label: '' });
  }
  for (let d = 1; d <= 31; d += 1) {
    const sel = d === m.selectedDay;
    const has = m.catalog.events.some((e) => e.day === d);
    cells.push({
      key: 3 + d,
      day: d,
      blank: false,
      selected: sel,
      dot: has && !sel,
      label: `July ${d}`,
    });
  }
  cells.push({ key: 40, day: 0, blank: true, selected: false, dot: false, label: '' });
  return cells;
}

export function selectedDayName(m: Model): string {
  return DAY_NAMES[(2 + m.selectedDay) % 7];
}

export type DayRow = {
  id: number;
  timeShort: string;
  ampm: string;
  title: string;
  venue: string;
  dist: string;
  att: number;
  i1: string;
  i2: string;
  i3: string;
};

export function dayRows(m: Model): DayRow[] {
  return m.catalog.events
    .filter((e) => e.day === m.selectedDay)
    .map((e) => ({
      id: e.id,
      timeShort: e.timeShort,
      ampm: e.ampm,
      title: e.title,
      venue: e.venue,
      dist: e.dist,
      att: e.att,
      i1: POOL[e.id % 7],
      i2: POOL[(e.id + 1) % 7],
      i3: POOL[(e.id + 2) % 7],
    }));
}

export const hasDayEvents = (m: Model): boolean =>
  m.catalog.events.some((e) => e.day === m.selectedDay);
export const noDayEvents = (m: Model): boolean => !hasDayEvents(m);

// ---------------------------------------------------------------------------
// You

export const groupRows = (m: Model): GroupRow[] => m.catalog.groups;
export const chatRows = (m: Model): ChatRow[] => m.catalog.chats;

// ---------------------------------------------------------------------------
// Detail

export const selTitle = (m: Model): string => eventById(m, m.selectedId).title;
export const selCatLabel = (m: Model): string => eventById(m, m.selectedId).catLabel;
export const selVenue = (m: Model): string => eventById(m, m.selectedId).venue;
export const selArea = (m: Model): string => eventById(m, m.selectedId).area;
export const selDist = (m: Model): string => eventById(m, m.selectedId).dist;
export const selTime = (m: Model): string => eventById(m, m.selectedId).time;
export const selDateNum = (m: Model): number => eventById(m, m.selectedId).day;
export const selDayName = (m: Model): string =>
  DAY_NAMES[(2 + eventById(m, m.selectedId).day) % 7];
export const selHost = (m: Model): string => eventById(m, m.selectedId).host;
export const selHostInit = (m: Model): string => eventById(m, m.selectedId).hostInit;
export const selAbout = (m: Model): string => eventById(m, m.selectedId).about;
export const selAtt = (m: Model): number => eventById(m, m.selectedId).att;
export const selFriends = (m: Model): number => eventById(m, m.selectedId).friends;

export function selOthers(m: Model): number {
  const e = eventById(m, m.selectedId);
  return e.att - e.friends;
}

export const selGoing = (m: Model): boolean => rsvpOf(m, m.selectedId) === 'going';
export const selInterested = (m: Model): boolean => rsvpOf(m, m.selectedId) === 'interested';
export const selFollowed = (m: Model): boolean => followOf(m, m.selectedId);
