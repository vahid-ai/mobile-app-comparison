# Pulse Events — Zero Native

The [claude.ai/design "Pulse Events"](https://claude.ai/design/p/c8aee1a6-b5bf-423b-b167-4900ed76955d)
mock — a nightlife discovery app — implemented as a **Zero Native** app
([vercel-labs/native](https://github.com/vercel-labs/native)): logic in
TypeScript (`src/core.ts`, the app-core subset, compiled ahead-of-time to
native code — no JS runtime ships in the binary), the whole view in
declarative markup (`src/app.native`), and the app manifest in `app.zon`.
Three files of truth, zero build config.

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
switched); everything the view shows is derived by exported helpers the
markup binds by name. No effects, no subscriptions — the app is a pure
loop.

## Design adaptations

The mock is a free-form HTML/CSS phone frame; Zero Native markup styles
through design tokens and lays out with flex only, so:

- The Pulse orange-red rides the manifest's `theme_accent` (`#ff5a2b`)
  over the Geist pack; surfaces/text use semantic tokens and follow the
  OS light/dark appearance instead of the mock's fixed dark palette.
- Poster-art gradients became accent surfaces and initial avatars;
  the phone status bar is the real window chrome.
- The map's absolutely-positioned pins are emulated with
  spacer-offset layers inside a `stack`.

## The loop

```sh
native dev --core   # fastest: run the core's logic under node -
                    # dispatch messages as JSON lines, watch the model
                    # transcript (not a renderer)
native dev          # build and run the real app (markup hot reload)
native dev --target ios      # iOS simulator (experimental)
native dev --target android  # Android emulator (experimental)
native check        # verify core.ts (subset checker) + markup + app.zon
native build        # ReleaseFast binary in zig-out/bin/
```

Try the core loop directly:

```sh
printf '%s\n' '{"kind":"go_calendar"}' '{"kind":"pick_day","day":22}' '{"kind":"open_event","id":4}' '{"kind":"toggle_going"}' | native dev --core
```

Verified in this tree: `native check` passes (subset checker clean,
markup ok, manifest valid), and the core's full navigation/RSVP flow was
driven under `native dev --core` with a scripted message transcript.

## Editor support

Stock editor TypeScript just works: `package.json` and `tsconfig.json`
are the editor-and-versioning surface (the tsconfig mirrors the checker's
own options, so editor errors match `native check`), and
`node_modules/@native-sdk/core` is a CLI-managed copy of the SDK package
so `@native-sdk/core` resolves with full IntelliSense. Builds never read
any of it — delete node_modules and every `native` verb still works.

## Requirements

Node.js 22.15+ (on the 23 line: 23.5+) on PATH (the TypeScript-to-native
transpiler runs at build time; your shipped binary carries none of it),
plus the `native` CLI (`npm install -g @native-sdk/cli`).
