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
eas.json       EAS build profiles (see "Getting it onto a phone")
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

## Getting it onto a phone

### Right now, no account needed

```sh
npm start          # scan the QR with Expo Go
```

Every dependency this app uses — `expo-status-bar`, `react-native-svg`,
`react-native-safe-area-context`, and `lucide-react-native` on top of them —
ships inside Expo Go, so nothing here needs a custom native build.

### From CI

[`.github/workflows/expo-preview.yml`](../.github/workflows/expo-preview.yml)
runs on every push and pull request that touches this directory:

- **verify** — typecheck, the 32 parity tests, and a Metro bundle for both
  iOS and Android. No secrets, so it runs on fork pull requests too.
- **publish** — `eas update`, and on a pull request a QR-code comment
  pointing at that update.

The EAS project is already wired up in `app.json`:

```jsonc
"runtimeVersion": { "policy": "sdkVersion" },
"updates": { "url": "https://u.expo.dev/5289f214-1136-42b1-ab61-41318a9aad10" },
"extra": { "eas": { "projectId": "5289f214-1136-42b1-ab61-41318a9aad10" } }
```

So `publish` needs exactly one more thing: a token from
<https://expo.dev/settings/access-tokens>, added as a repository secret named
`EXPO_TOKEN`. Until it exists the job exits **green** with instructions in its
step summary rather than failing.

### Android dev builds — the `android` branch

`android` is a long-lived integration branch for Android work. Opening a pull
request **into** it runs
[`.github/workflows/android-dev-build.yml`](../.github/workflows/android-dev-build.yml):

1. **gate** — typecheck and the parity tests. Cheap, and it runs first so a
   broken commit never spends an EAS build.
2. **build** — `eas build --platform android --profile development`, waits for
   it, downloads the APK, and publishes it as a **prerelease** tagged
   `android-dev-pr<number>-<run>` with the APK attached. The download link is
   commented on the pull request.

Install that APK once on a device or emulator and it becomes a target for
every `eas update` the preview workflow publishes — no rebuild needed for JS
changes. That is the whole point of a development build, and it is the
guaranteed path if Expo Go will not open an update.

Two things the first runs settled:

- **Android signing is handled.** EAS generated the keystore on demand under
  `--non-interactive` (`✔ Created keystore`), so there is no manual
  `eas credentials` step. Later builds reuse it.
- **The free-tier queue is long.** The first build sat in it for over 90
  minutes. So the job does not use `eas build --wait`: it submits with
  `--no-wait`, comments the EAS build URL on the pull request within a couple
  of minutes, and only then polls for completion. The link is useful even if
  the wait is later abandoned, and the job's own bound is 350 minutes
  (Actions minutes are free on public repositories).

  If a build for the same commit is already in flight — a re-run, or a
  retried job — the workflow attaches to it instead of paying for another.

### Why `sdkVersion` and not `appVersion`

`runtimeVersion` is what ties an update to a native runtime, and it decides
whether Expo Go will load what CI publishes:

- **`sdkVersion`** (used here) resolves to `exposdk:57.0.0` — the runtime
  Expo Go itself reports. This is the policy that targets Expo Go.
- **`appVersion`** — what `eas update:configure` writes by default — resolves
  to `0.1.0`, which only a build of this app carrying that version will
  accept. Correct for production, wrong for Expo Go.

Expo's docs push toward a [development build][eas-go] rather than Expo Go,
and that path is the guaranteed one:

```sh
npx eas build --profile development --platform ios     # or android
```

Install that once and every `eas update` — including every one this workflow
publishes — arrives over the air. `eas.json` already carries the
`development` profile for it.

**Note on the slug.** `expo.slug` is `pulse`, not `pulse-events`, because it
has to match the slug of EAS project `5289f214…`; `eas update` refuses to run
on a mismatch. The Cloudflare Worker (`pulse-events-api`) and the D1 database
(`pulse-events`) are unrelated names and keep theirs.

**Confirmed by the first real run:** eas-cli 21.3.0 accepts the `sdkVersion`
policy, and the published update is tagged `runtimeVersion: exposdk:57.0.0`
for both iOS and Android — the runtime Expo Go reports for itself.

**Still unverified:** whether Expo Go actually *opens* that update. That
needs a device, and there is none in the environment this was built in. Scan
the QR in the pull request comment to find out; if it refuses, install the
development build above and every published update lands there over the air.

Updates from a pull request go to the EAS branch `pr-<number>`, and pushes to
`main` go to a branch of the same name.

The classic `expo publish`, which put a JS bundle in Expo Go behind a
permanent URL with none of this ceremony, was removed in SDK 50 and has no
current equivalent.

[eas-go]: https://docs.expo.dev/eas-update/runtime-versions/

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
