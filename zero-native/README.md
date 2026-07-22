# Pulse Events — Zero Native

The [claude.ai/design "Pulse Events"](https://claude.ai/design/p/c8aee1a6-b5bf-423b-b167-4900ed76955d)
mock — a nightlife discovery app — implemented as a **Zero Native** app
([vercel-labs/native](https://github.com/vercel-labs/native)): logic in
a Zig app core (`src/core.zig` + its `src/rt.zig` arena kernel), the
whole view in declarative markup (`src/app.native`), wiring in
`src/main.zig`, and the app manifest in `app.zon`.

The core began life as TypeScript (`core.ts`, the app-core subset) and
was ported to Zig because the SDK's mobile embed library only supports
Zig cores today (`native dev --target android` panics on TS-core trees:
"TypeScript app cores build desktop apps today"). The port is the
subset transpiler's own emission of that core.ts, committed to the tree
verbatim — same Model/Msg/update, same helper names the markup binds,
same committed-model semantics — with `src/main.zig` driving it through
`TsCoreHost` on both hosts and declaring the mobile contract
(`Model`/`Msg`/`initModel`/`mobileOptions`) the embed host requires.

## What's implemented

- **Discover** — location header, search bar, category filter chips
  (All / Tonight / House / Techno / Free), the featured "Happening
  Tonight" card, and the "For you" feed with one-tap Join.
- **Map** — a pin field over the venue map (pins placed with spacer
  offsets inside a `stack`; picking a pin swaps the floating event
  bubble), plus the "events near you" bottom sheet.
- **Calendar** — July 2026 grid with event dots and selection, and a
  timeline of the selected day's events (empty state included).
- **You** — profile, stats, groups grid, and group chats with unread
  badges.
- **Event detail** — pushed from any screen: hero, date/venue rows, host
  follow toggle, about, who's-going, and the sticky Interested / "Get on
  the list" RSVP bar. RSVP state round-trips everywhere (feed Join
  buttons, detail CTA).

All state transitions live in `update` (Model/Msg, exhaustively
switched); everything the view shows is derived by helpers on the Model
the markup binds by name. No effects, no subscriptions — the app is a
pure loop.

## Design adaptations

The mock is a free-form HTML/CSS phone frame; Zero Native markup styles
through design tokens and lays out with flex only, so:

- The Pulse orange-red rides the manifest's `theme_accent` (`#ff5a2b`)
  over the Geist pack; surfaces/text use semantic tokens and follow the
  OS light/dark appearance instead of the mock's fixed dark palette.
- Poster-art gradients became accent surfaces and initial avatars;
  the phone status bar is the real window chrome (desktop) or the
  device's own (Android).
- The map's absolutely-positioned pins are emulated with
  spacer-offset layers inside a `stack`.

## The loop

```sh
native dev                   # build and run the desktop app (markup hot reload)
native dev --target android  # debug APK, install + launch on an emulator via adb (experimental)
native check                 # verify markup + app.zon against the model contract
native test                  # app tests + refresh zig-out/model-contract.zon
native build                 # ReleaseFast binary in zig-out/bin/
```

## Verified in this tree

- `native check` and `native test` pass; `native build` produces the
  desktop binary.
- **Android**: built, installed, and ran on an API 36 x86_64 emulator
  (arm64 APK via the image's `libndk_translation`) — Discover renders,
  touch navigation works (Calendar tab, day selection, event dots).

Two Windows-host workarounds were needed as of SDK 0.5.4:

1. `native dev --target android` needs `JAVA_HOME` (dex compiler and
   APK signer are JVM tools) — Android Studio's bundled JBR works:
   `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`.
2. The CLI's APK assembler writes the native-lib zip entry with
   Windows path separators (`lib\arm64-v8a\libnative_sdk_host.so`), so
   Android skips native-lib extraction and the app crashes at launch
   with `UnsatisfiedLinkError`. Repack `.native/android/*.apk` with
   forward-slash entry names (python `zipfile`), `zipalign -f 4`,
   re-sign with `apksigner` (debug keystore), then
   `adb install --no-incremental`. (Also: adb *incremental* installs
   leave `primaryCpuAbi=null` on the translation image — use
   `--no-incremental`.)

## Requirements

The `native` CLI (`npm install -g @native-sdk/cli`) with Zig 0.16 on
PATH. For Android: a JDK (`JAVA_HOME`), the Android SDK
(platform-tools + NDK), and a running emulator or device on `adb`.
