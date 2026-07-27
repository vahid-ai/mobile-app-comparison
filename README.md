# mobile-app-comparison
Comparing different frameworks for building mobile apps

## Implementations

| App | Framework | Backend | Targets | Directory |
| --- | --- | --- | --- | --- |
| Pulse Events | [Zero Native](https://github.com/vercel-labs/native) (Vercel's Native SDK — Zig core + declarative markup, compiled to native; ported from the TS core for Android support) | none — catalog is `const` data in the binary | macOS, Android | [`zero-native/`](zero-native/) |
| Pulse Events | [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/) (SDK 57, RN 0.86, TypeScript) | [Cloudflare](https://developers.cloudflare.com/) Worker + D1 | iOS, Android | [`react-native-cloudflare/`](react-native-cloudflare/) |

Both rows are the same app — the same
[claude.ai/design "Pulse Events"](https://claude.ai/design/p/c8aee1a6-b5bf-423b-b167-4900ed76955d)
mock, the same six events, the same five screens, the same reducer semantics
and the same `#ff5a2b` accent — so what differs between the directories is the
stack, not the product.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Both implementations. Pull requests here publish an EAS Update with a QR-code preview. |
| `android` | Android work. Pull requests **into** this branch build a development APK on EAS and attach it to a prerelease — see [the workflow](.github/workflows/android-dev-build.yml). |

The React Native tree keeps the Zig core's architecture intact: `update` is
still pure and exhaustively switched, and a suite of parity tests asserts the
Zig core's behaviour against the TypeScript port. What the Cloudflare backend
changes is where the catalog lives (D1 rather than rodata) and that RSVP state
now survives an app restart.
