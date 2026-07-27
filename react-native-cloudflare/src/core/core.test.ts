/**
 * Parity tests — every assertion here is a statement about what
 * `zero-native/src/core.zig` does, checked against this port.
 *
 * The two trees share no code, so this file is the contract between them:
 * if a number, a label or a transition differs, the app is no longer the
 * same app, and one of these fails.
 */
import { describe, expect, it } from 'vitest';

import { BUNDLED_CATALOG, CATS, EVENTS } from './catalog';
import { initialModel, update, type Model, type Msg } from './model';
import {
  calCells,
  catRows,
  dayRows,
  feedRows,
  featuredId,
  hasDayEvents,
  isDetail,
  mapCards,
  mapCount,
  mapPins,
  noDayEvents,
  selAtt,
  selDayName,
  selFollowed,
  selFriends,
  selGoing,
  selInterested,
  selOthers,
  selTitle,
  selectedDayName,
  showTabbar,
} from './selectors';

/** A model with the catalog already loaded, as the Worker would deliver it. */
function loaded(): Model {
  return update(initialModel(), {
    type: 'catalog_loaded',
    catalog: BUNDLED_CATALOG,
    state: { rsvps: [], follows: [] },
    source: 'cloudflare',
  });
}

function run(model: Model, ...msgs: Msg[]): Model {
  return msgs.reduce(update, model);
}

describe('initial model', () => {
  it('matches initialModel() in core.zig', () => {
    const m = initialModel();
    expect(m.tab).toBe('discover');
    expect(m.prevTab).toBe('discover');
    expect(m.selectedId).toBe(1);
    expect(m.mapSelId).toBe(2);
    expect(m.cat).toBe('all');
    expect(m.selectedDay).toBe(21);
    expect(m.rsvps).toEqual([]);
    expect(m.follows).toEqual([]);
  });
});

describe('catalog', () => {
  it('carries the six events the Zig core compiles in', () => {
    expect(EVENTS.map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(EVENTS.map((e) => e.title)).toEqual([
      'Neon Warehouse',
      'Rooftop Sunset Sessions',
      'Vinyl Nights: Disco',
      'Afterhours: Deep Cuts',
      'Y2K Throwback Rave',
      'Backyard Beats & BBQ',
    ]);
  });

  it('keeps the category order the design pins (not alphabetical)', () => {
    expect(CATS.map((c) => c.label)).toEqual(['All', 'Tonight', 'House', 'Techno', 'Free']);
  });
});

describe('navigation', () => {
  it('remembers the tab to come back to', () => {
    const m = run(loaded(), { type: 'go_calendar' }, { type: 'open_event', id: 4 });
    expect(isDetail(m)).toBe(true);
    expect(m.selectedId).toBe(4);
    expect(m.prevTab).toBe('calendar');
    expect(run(m, { type: 'back' }).tab).toBe('calendar');
  });

  it('keeps the original prevTab when opening an event from detail', () => {
    const m = run(
      loaded(),
      { type: 'go_map' },
      { type: 'open_event', id: 1 },
      { type: 'open_event', id: 5 },
    );
    expect(m.selectedId).toBe(5);
    expect(m.prevTab).toBe('map');
  });

  it('hides the tab bar on detail only', () => {
    expect(showTabbar(loaded())).toBe(true);
    expect(showTabbar(run(loaded(), { type: 'open_event', id: 1 }))).toBe(false);
  });
});

describe('category filter', () => {
  it('all keeps every event', () => {
    expect(feedRows(loaded()).map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('tonight is day 21', () => {
    const m = update(loaded(), { type: 'pick_cat', cat: 'tonight' });
    expect(feedRows(m).map((r) => r.id)).toEqual([1]);
  });

  it('free is the free flag, not the price string', () => {
    const m = update(loaded(), { type: 'pick_cat', cat: 'free' });
    expect(feedRows(m).map((r) => r.id)).toEqual([3, 6]);
  });

  it('house and techno match the event category', () => {
    expect(
      feedRows(update(loaded(), { type: 'pick_cat', cat: 'house' })).map((r) => r.id),
    ).toEqual([2, 3, 6]);
    expect(
      feedRows(update(loaded(), { type: 'pick_cat', cat: 'techno' })).map((r) => r.id),
    ).toEqual([1, 4]);
  });

  it('marks the active chip', () => {
    const rows = catRows(update(loaded(), { type: 'pick_cat', cat: 'techno' }));
    expect(rows.filter((r) => r.active).map((r) => r.tag)).toEqual(['techno']);
  });
});

describe('RSVP toggle semantics', () => {
  it('sets, then clears when set again', () => {
    let m = update(loaded(), { type: 'join_event', id: 3 });
    expect(feedRows(m).find((r) => r.id === 3)?.statusLabel).toBe('Going');
    expect(feedRows(m).find((r) => r.id === 3)?.joined).toBe(true);

    m = update(m, { type: 'join_event', id: 3 });
    expect(feedRows(m).find((r) => r.id === 3)?.statusLabel).toBe('Join');
    expect(feedRows(m).find((r) => r.id === 3)?.joined).toBe(false);
  });

  it('replaces the other status rather than stacking', () => {
    const m = run(
      loaded(),
      { type: 'open_event', id: 2 },
      { type: 'toggle_interested' },
      { type: 'toggle_going' },
    );
    expect(selGoing(m)).toBe(true);
    expect(selInterested(m)).toBe(false);
    expect(m.rsvps.filter((r) => r.id === 2)).toHaveLength(1);
  });

  it('shows Saved for interested in the feed', () => {
    const m = run(loaded(), { type: 'open_event', id: 5 }, { type: 'toggle_interested' });
    expect(feedRows(m).find((r) => r.id === 5)?.statusLabel).toBe('Saved');
    expect(feedRows(m).find((r) => r.id === 5)?.joined).toBe(false);
  });

  it('round-trips between the feed Join button and the detail CTA', () => {
    const m = run(loaded(), { type: 'join_event', id: 4 }, { type: 'open_event', id: 4 });
    expect(selGoing(m)).toBe(true);
  });

  it('keeps a cleared RSVP as an entry with status none', () => {
    const m = run(loaded(), { type: 'join_event', id: 1 }, { type: 'join_event', id: 1 });
    expect(m.rsvps).toEqual([{ id: 1, status: 'none' }]);
  });
});

describe('follow toggle', () => {
  it('turns on first, then flips', () => {
    let m = run(loaded(), { type: 'open_event', id: 1 });
    expect(selFollowed(m)).toBe(false);
    m = update(m, { type: 'toggle_follow' });
    expect(selFollowed(m)).toBe(true);
    m = update(m, { type: 'toggle_follow' });
    expect(selFollowed(m)).toBe(false);
    expect(m.follows).toHaveLength(1);
  });
});

describe('map', () => {
  it('grows the selected pin to 52 and leaves the rest at their size', () => {
    const m = update(loaded(), { type: 'pick_pin', id: 3 });
    const pins = mapPins(m);
    expect(pins.find((p) => p.id === 3)).toMatchObject({ size: 52, selected: true });
    expect(pins.find((p) => p.id === 1)).toMatchObject({ size: 44, selected: false });
  });

  it('places pins at the catalog coordinates', () => {
    const pin = mapPins(loaded()).find((p) => p.id === 4);
    expect(pin).toMatchObject({ left: 266, top: 350 });
  });

  it('shows the first two events in the bottom sheet and counts them all', () => {
    expect(mapCards(loaded()).map((c) => c.id)).toEqual([1, 2]);
    expect(mapCount(loaded())).toBe(6);
  });
});

describe('calendar', () => {
  it('lays July 2026 out as 3 blanks + 31 days + 1 blank', () => {
    const cells = calCells(loaded());
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 3).every((c) => c.blank)).toBe(true);
    expect(cells[3]).toMatchObject({ key: 4, day: 1, blank: false });
    expect(cells[33]).toMatchObject({ key: 34, day: 31 });
    expect(cells[34]).toMatchObject({ key: 40, blank: true });
  });

  it('dots the days with events, except the selected one', () => {
    const cells = calCells(loaded());
    const dotted = cells.filter((c) => c.dot).map((c) => c.day);
    // events fall on 21, 22, 24, 25, 26; 21 is selected, so it loses its dot
    expect(dotted).toEqual([22, 24, 25, 26]);
    expect(cells.find((c) => c.day === 21)).toMatchObject({ selected: true, dot: false });
  });

  it('names the weekday from the July 2026 offset', () => {
    expect(selectedDayName(loaded())).toBe('Tuesday'); // July 21, 2026
    expect(selectedDayName(update(loaded(), { type: 'pick_day', day: 4 }))).toBe('Saturday');
    expect(selDayName(run(loaded(), { type: 'open_event', id: 5 }))).toBe('Sunday'); // July 26
  });

  it('lists the selected day and cycles the avatar pool', () => {
    const m = update(loaded(), { type: 'pick_day', day: 22 });
    const rows = dayRows(m);
    expect(rows.map((r) => r.id)).toEqual([4, 6]);
    // POOL is [MR DZ KT PA LM NB JS]; row id 4 reads POOL[4], [5], [6]
    expect(rows[0]).toMatchObject({ i1: 'LM', i2: 'NB', i3: 'JS' });
    // row id 6 wraps: POOL[6], POOL[0], POOL[1]
    expect(rows[1]).toMatchObject({ i1: 'JS', i2: 'MR', i3: 'DZ' });
    expect(hasDayEvents(m)).toBe(true);
    expect(noDayEvents(m)).toBe(false);
  });

  it('reports the empty state on a day with nothing', () => {
    const m = update(loaded(), { type: 'pick_day', day: 3 });
    expect(dayRows(m)).toEqual([]);
    expect(hasDayEvents(m)).toBe(false);
    expect(noDayEvents(m)).toBe(true);
  });
});

describe('detail', () => {
  it('derives the who-is-going split', () => {
    const m = run(loaded(), { type: 'open_event', id: 1 });
    expect(selTitle(m)).toBe('Neon Warehouse');
    expect(selAtt(m)).toBe(342);
    expect(selFriends(m)).toBe(12);
    expect(selOthers(m)).toBe(330);
  });

  it('features the first event', () => {
    expect(featuredId(loaded())).toBe(1);
  });
});

describe('purity', () => {
  it('never mutates the model it is given', () => {
    const before = loaded();
    const snapshot = JSON.stringify(before);
    run(
      before,
      { type: 'join_event', id: 2 },
      { type: 'pick_cat', cat: 'free' },
      { type: 'open_event', id: 3 },
      { type: 'toggle_follow' },
      { type: 'pick_day', day: 9 },
    );
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('sync', () => {
  it('falls back to the bundled catalog when the Worker is unreachable', () => {
    const m = update(initialModel(), {
      type: 'sync_failed',
      error: 'offline',
      catalog: BUNDLED_CATALOG,
    });
    expect(m.sync).toMatchObject({ status: 'offline', source: 'bundled' });
    expect(m.catalog.events).toHaveLength(6);
  });

  it('does not clobber a loaded catalog when a write fails', () => {
    const m = update(loaded(), {
      type: 'sync_failed',
      error: 'PUT /api/rsvp -> 500',
      catalog: { events: [], cats: [], groups: [], chats: [] },
    });
    expect(m.catalog.events).toHaveLength(6);
    expect(m.sync).toMatchObject({ status: 'offline', source: 'cloudflare' });
  });

  it('adopts the state D1 returns', () => {
    const m = update(initialModel(), {
      type: 'catalog_loaded',
      catalog: BUNDLED_CATALOG,
      state: { rsvps: [{ id: 2, status: 'going' }], follows: [{ id: 2, on: true }] },
      source: 'cloudflare',
    });
    const detail = update(m, { type: 'open_event', id: 2 });
    expect(selGoing(detail)).toBe(true);
    expect(selFollowed(detail)).toBe(true);
  });
});
