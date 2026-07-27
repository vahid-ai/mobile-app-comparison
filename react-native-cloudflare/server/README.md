# Pulse Events API — Cloudflare Worker + D1

The backend the Zero Native build does not have. It serves the event catalog
out of D1 and persists per-user RSVP and follow state there.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | liveness + row counts |
| `GET` | `/api/bootstrap` | catalog + the caller's state, one round trip |
| `PUT` | `/api/rsvp` | `{ eventId, status }` — persist one RSVP |
| `PUT` | `/api/follow` | `{ eventId, on }` — persist one host follow |

The caller identifies itself with an `x-pulse-user` header (default `alexr`).

## Data model

Six tables — four for the catalog (`events`, `categories`, `groups`, `chats`),
which is what `zero-native/src/core.zig` compiles in as `const` tables, and two
for state (`rsvps`, `follows`), which is what that core keeps in its model heap
and loses on exit.

Two details worth knowing:

- **Catalog order is load-bearing.** `featuredId` reads `events[0]` and
  `mapCards` reads `events[0..2]`, so `events` is always selected `ORDER BY id`
  and its ids are assigned in catalog order. `categories` has no natural order
  (All, Tonight, House, Techno, Free), so it carries an explicit `sort`.
- **A cleared RSVP is stored, not deleted.** The core's toggle sets status to
  `none` rather than dropping the entry, so the row stays and the round trip is
  exact.

`seed.sql` is generated, never hand-edited:

```sh
npm run seed:generate    # emits seed.sql from ../src/core/catalog.ts
```

The app's `npm test` re-runs that generator in memory and fails if the
committed file has drifted from the catalog.

## Deploying

The database already exists in the account this repo was built from:

```
name         pulse-events
database_id  24136797-e613-46a8-b3f9-4e627b2bcb5c   (already in wrangler.jsonc)
region       ENAM
```

Its schema is applied and the catalog is seeded. So from a machine with
Cloudflare credentials:

```sh
npm install
npx wrangler login       # or set CLOUDFLARE_API_TOKEN
npm run deploy
```

Then point the app at the URL that prints:

```sh
echo 'EXPO_PUBLIC_PULSE_API=https://pulse-events-api.<your-subdomain>.workers.dev' > ../.env
```

Starting from an empty account instead:

```sh
npx wrangler d1 create pulse-events   # put the new id in wrangler.jsonc
npm run db:schema
npm run db:seed
npm run deploy
```

## Local development

Everything runs offline against a local SQLite copy of D1 — no Cloudflare
account needed:

```sh
npm run db:schema:local
npm run db:seed:local
npm run dev              # http://127.0.0.1:8787
```

That is how the routes in this tree were exercised; see the parent README's
"Verified in this tree".

## Security

This is demo-grade and should not be treated otherwise:

- **`x-pulse-user` is not authentication.** It is an unverified client-supplied
  string, so anyone can read or write anyone else's RSVP state by setting it.
  Real accounts need a signed token (Cloudflare Access, or your own JWT
  verified in the Worker) with the user id taken from the verified claims, not
  the header.
- **CORS is `*`.** The catalog is public read-only data and Expo dev clients
  call from an origin that changes every run, so the Worker allows any origin.
  Narrow this to your app's origins before putting anything real behind it.
- **No rate limiting.** Add [Rate Limiting rules][rl] or a Durable Object
  counter if this is ever exposed beyond a demo.

The `database_id` in `wrangler.jsonc` is committed on purpose: it is an
account-scoped identifier, not a credential, and is useless without API
tokens. No secrets belong in this directory.

[rl]: https://developers.cloudflare.com/waf/rate-limiting-rules/
