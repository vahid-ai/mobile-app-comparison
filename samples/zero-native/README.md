# zero-native sample

[zero-native](https://zero-native.dev/) embeds a web UI in a native shell (Zig + system WebView). Mobile support uses the **EmbeddedApp** C ABI: you build `libzero-native.a` and link it from an iOS or Android host app.

## Layout

| Path | Purpose |
|------|---------|
| `desktop/` | React + Zig desktop app (`zero-native init --frontend react`) for fast UI iteration |
| `../third_party/zero-native/examples/android` | Upstream Android host (cloned by `scripts/ensure-zero-native.sh`) |

## Prerequisites

- Zig **0.16.0+**
- Node.js **20+** with npm
- Android SDK + NDK **26.1** (for Android APK builds)
- Linux desktop dev: `libgtk-4-dev`, `libwebkitgtk-6.0-dev`

## Commands (from repo root)

```bash
npm install
npm run zn:test          # layout + manifest checks
npm run zn:android:lib   # build libzero-native.a for arm64 Android
npm run zn:android:apk   # assemble debug APK
npm run zn:desktop:run   # run desktop shell (needs display / WebKitGTK)
```

## Mobile workflow

1. Build the static library: `npm run zn:android:lib`
2. Assemble the host APK: `npm run zn:android:apk`
3. Install on device/emulator (with `adb`):

```bash
adb install -r third_party/zero-native/examples/android/app/build/outputs/apk/debug/app-debug.apk
```

iOS requires macOS + Xcode; see [upstream iOS example](https://github.com/vercel-labs/zero-native/tree/main/examples/ios).

## Patches

`patches/zero-native-android.patch` enables PIC for JNI linking and sets Gradle JVM/ABI options required on Linux CI.
