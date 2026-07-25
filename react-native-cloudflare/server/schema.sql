-- Pulse Events — D1 schema.
--
-- The four catalog tables hold what `zero-native/src/core.zig` compiles in
-- as `const` tables (EVENTS / CATS / GROUPS / CHATS); the two state tables
-- hold what that core keeps in the Model (`rsvps` / `follows`), which is
-- the part that has to survive an app restart now that there is a server.
--
-- Catalog order is load-bearing: the app's `featuredId` reads events[0] and
-- `mapCards` reads events[0..2], so `events` is always selected `ORDER BY
-- id` and its ids are assigned in catalog order. `categories` has no such
-- natural order (All, Tonight, House, Techno, Free), so it carries `sort`.

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS rsvps;
DROP TABLE IF EXISTS follows;

CREATE TABLE events (
  id         INTEGER PRIMARY KEY,
  title      TEXT    NOT NULL,
  venue      TEXT    NOT NULL,
  area       TEXT    NOT NULL,
  day        INTEGER NOT NULL,
  time       TEXT    NOT NULL,
  time_short TEXT    NOT NULL,
  ampm       TEXT    NOT NULL,
  cat        TEXT    NOT NULL,
  cat_label  TEXT    NOT NULL,
  price      TEXT    NOT NULL,
  free       INTEGER NOT NULL,
  dist       TEXT    NOT NULL,
  att        INTEGER NOT NULL,
  friends    INTEGER NOT NULL,
  host       TEXT    NOT NULL,
  host_init  TEXT    NOT NULL,
  about      TEXT    NOT NULL,
  pin_left   INTEGER NOT NULL,
  pin_top    INTEGER NOT NULL,
  pin_size   INTEGER NOT NULL
);

CREATE TABLE categories (
  tag   TEXT    PRIMARY KEY,
  label TEXT    NOT NULL,
  sort  INTEGER NOT NULL
);

CREATE TABLE groups (
  id      INTEGER PRIMARY KEY,
  init    TEXT    NOT NULL,
  name    TEXT    NOT NULL,
  members INTEGER NOT NULL,
  note    TEXT    NOT NULL
);

CREATE TABLE chats (
  id     INTEGER PRIMARY KEY,
  init   TEXT    NOT NULL,
  name   TEXT    NOT NULL,
  last   TEXT    NOT NULL,
  "when" TEXT    NOT NULL,
  unread INTEGER NOT NULL
);

-- `status` mirrors the core's Rsvp enum, 'none' included: the reducer keeps
-- a cleared RSVP as an entry with status 'none' rather than dropping it, so
-- the row stays and the round trip is exact.
CREATE TABLE rsvps (
  user_id    TEXT    NOT NULL,
  event_id   INTEGER NOT NULL,
  status     TEXT    NOT NULL CHECK (status IN ('none', 'interested', 'going')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

-- `following` rather than `on`: ON is a SQL keyword.
CREATE TABLE follows (
  user_id    TEXT    NOT NULL,
  event_id   INTEGER NOT NULL,
  following  INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX idx_events_day ON events (day);
