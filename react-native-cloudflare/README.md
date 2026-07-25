# Pulse Events — React Native + Cloudflare

The same [claude.ai/design "Pulse Events"](https://claude.ai/design/p/c8aee1a6-b5bf-423b-b167-4900ed76955d)
mock as [`zero-native/`](../zero-native/) — a nightlife discovery app — built
a second time on a completely different stack:

| | Zero Native | this tree |
| --- | --- | --- |
| Language | Zig | TypeScript |
| View tier | `app.native` declarative markup | React Native components |
| Targets | macOS, Android | **iOS, Android** (Expo SDK 57, RN 0.86) |
| Catalog | `const` tables in the binary | Cloudflare **D1** |
| RSVP / follow state | model heap, lost on exit | Cloudflare D1, survives restarts |
| Memory | frame arena + two-space committed heap (`rt.zig`) | the JS GC |

Everything else is deliberately the same: the same six events, the same five
screens, the same reducer semantics, the same `#ff5a2b` accent over a Geist
palette that follows the OS light/dark setting.

## What's implemented

Feature parity with the Zero Native build, screen for screen:

- **Discover** — location header, search bar, category filter chips
  (All / Tonight / House / Techno / Free), the featured "Happening Tonight"
  card, and the "For you" feed with one-tap Join.
- **Map** — a pin field over the venue map (picking a pin swaps the floating
  event bubble), plus the "events near you" bottom sheet.
- **Calendar** — July 2026 grid with event dots and selection, and a timeline
  of the selected day's events (empty state included).
- **You** — profile, stats, groups grid, and group chats with unread badges.
- **Event detail** — pushed from any screen: hero, date/venue rows, host
  follow toggle, about, who's-going, and the sticky Interested / "Get on the
  list" RSVP bar. RSVP state round-trips everywhere and now also persists to
  D1.

## Layout

```
src/
  core/        Model, Msg, pure update, and every selector the Zig core has
  api/         the Worker client, and the store — the only place effects live
  ui/          the markup vocabulary (column/row/panel/text/badge/...) in RN
  screens/     one file per screen, transcribed from app.native
  theme/       the design tokens app.zon declares
server/        the Cloudflare Worker and its D1 schema + seed
```

### The core is still a pure loop

`src/core/model.ts` has no imports from `src/api/` and performs no I/O:
`update(model, msg)` returns the next model and never mutates the one it was
given (there is a test for exactly that). The Zig core's guarantee survives
the port.

What the backend adds is a shell around that loop — `src/api/store.ts` —
which loads the catalog on mount and writes RSVP/follow changes back after
the reducer has already decided them. Writes are optimistic: the UI moves
immediately, the request follows, and a failure flips the offline notice
rather than rolling the model back.

## Running it

```sh
npm install
npm start          # Expo dev server; press i for iOS, a for Android
npm run ios
npm run android
npm test           # 32 parity tests against the Zig core's semantics
npm run typecheck
```

Without a backend configured the app runs off the catalog bundled in
`src/core/catalog.ts` and shows an "Offline" bar — every screen still works,
it just cannot persist anything. To point it at Cloudflare:

```sh
echo 'EXPO_PUBLIC_PULSE_API=https://pulse-events-api.<your-subdomain>.workers.dev' > .env
```

See [`server/README.md`](server/README.md) for deploying the Worker. The D1
database is already provisioned and seeded (`pulse-events`,
`24136797-e613-46a8-b3f9-4e627b2bcb5c`); only `wrangler deploy` is left.

## Verified in this tree

- `npm test` — 32 parity tests pass. They assert the *Zig core's* behaviour:
  the toggle semantics, the `(2 + day) % 7` weekday math, the 3-blank/31-day/
  1-blank July grid, the avatar-pool cycling, `prevTab` retention, the
  category predicates, and that `update` never mutates.
- `npm run typecheck` — clean, `strict` on.
- `npx expo export --platform ios --platform android` — **both** platforms
  bundle: 2474 modules (iOS) and 2472 (Android), ~3.5 MB Hermes bytecode each.
- The Worker was run under `wrangler dev --local` against a local D1 seeded
  from `seed.sql`, and every route exercised: bootstrap returns the 6 events
  in catalog order with the category order preserved, RSVP and follow writes
  round-trip, per-user state is isolated, and the validation paths return
  400/404 as intended.

Not verified here: the app has not been run on a real iOS or Android device.
This container has no simulator, no Xcode, and no Android SDK — the bundle
step above is as far as verification goes. Nor has the Worker been deployed:
`api.cloudflare.com` is blocked by this environment's network policy, so
`wrangler deploy` cannot run from here (the D1 database itself was created
and seeded over a different path, and is real).

## Design adaptations

The Zero Native README lists the adaptations its markup forced. Most of them
disappear here, which is itself part of the comparison:

- **Map pins.** Zero Native lays out with flex only, so the mock's absolutely
  positioned pins were emulated "with spacer offsets inside a `stack`". React
  Native has absolute positioning, so the pins use the same `pinLeft`/`pinTop`
  numbers directly.
- **Theming.** Both builds follow the OS appearance over semantic tokens
  rather than the mock's fixed dark palette; `src/theme/tokens.ts` restates
  what `app.zon` declares.
- **Status bar.** The real device chrome in both cases.
- **The catalog is now remote**, so this build has two states the Zero Native
  one cannot have: a loading splash and an offline notice.
