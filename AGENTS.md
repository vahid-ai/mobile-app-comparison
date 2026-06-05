# AGENTS.md

## Project overview

`mobile-app-comparison` compares mobile app frameworks. The **zero-native** sample is the first environment: Zig embeddable runtime + web frontend, with Android/iOS host apps from [vercel-labs/zero-native](https://github.com/vercel-labs/zero-native).

## Cursor Cloud specific instructions

### Toolchain (not in VM update script)

One-time / snapshot setup on Linux:

- **Zig 0.16.0** → `~/.local/zig-0.16.0` via `scripts/ensure-toolchain.sh`
- **Android SDK** → `~/Android/Sdk` (platform 35, NDK 26.1.10909125, cmake 3.22.1)
- **Gradle 8.7** → `~/.local/gradle-8.7` (installed on first APK build)
- **Desktop WebView (Linux)** → `libgtk-4-dev`, `libwebkitgtk-6.0-dev` for `zig build run`

`scripts/ensure-toolchain.sh` is idempotent; agents can source it for `PATH`, `ANDROID_HOME`, `ANDROID_NDK_HOME`, `ZIG_HOME`.

### Framework source

`third_party/zero-native` is **gitignored**. Clone + patch via:

```bash
bash scripts/ensure-zero-native.sh
```

Patch `patches/zero-native-android.patch` adds PIC for JNI and Gradle JVM/ABI fixes.

### Standard commands (repo root)

| Task | Command |
|------|---------|
| Install npm deps | `npm install` |
| Test (layout + manifest) | `npm test` / `npm run zn:test` |
| Build Android static lib | `npm run zn:android:lib` |
| Build Android debug APK | `npm run zn:android:apk` |
| Test desktop app | `npm run zn:desktop:test` |
| Run desktop app (GUI) | `npm run zn:desktop:run` |

### Services

No long-running servers. Desktop `zig build run` opens a native window (needs display). Android APK is built offline; install with `adb install -r third_party/zero-native/examples/android/app/build/outputs/apk/debug/app-debug.apk`.

### Gotchas

- Android APK build uses **arm64-v8a only** (`abiFilters`) because the Zig lib is built for `aarch64-linux-android`.
- Link `libzero-native.a` into JNI `.so` requires **PIC** (`embed_lib.root_module.pic = true` in patch).
- iOS builds need **macOS + Xcode**; not available on Linux Cloud VMs.
- `third_party/zero-native` must exist before Zig commands; run `npm run zn:ensure` if missing.

### Git

- Cloud agent branches: `cursor/<name>-f46e`
