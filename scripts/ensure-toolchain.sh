#!/usr/bin/env bash
set -euo pipefail

export ZIG_VERSION="${ZIG_VERSION:-0.16.0}"
export ZIG_HOME="${ZIG_HOME:-${HOME}/.local/zig-${ZIG_VERSION}}"
export ANDROID_HOME="${ANDROID_HOME:-${HOME}/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME}}"
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_HOME}/ndk/26.1.10909125}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"

if [[ ! -x "${ZIG_HOME}/zig" ]]; then
  echo "Installing Zig ${ZIG_VERSION} to ${ZIG_HOME}..."
  mkdir -p "${HOME}/.local"
  tmp="$(mktemp)"
  curl -fsSL "https://ziglang.org/download/${ZIG_VERSION}/zig-x86_64-linux-${ZIG_VERSION}.tar.xz" -o "${tmp}"
  tar -xJf "${tmp}" -C "${HOME}/.local"
  rm -f "${tmp}"
  mv "${HOME}/.local/zig-x86_64-linux-${ZIG_VERSION}" "${ZIG_HOME}"
fi

if [[ ! -x "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" ]]; then
  echo "Installing Android SDK to ${ANDROID_HOME}..."
  mkdir -p "${ANDROID_HOME}/cmdline-tools"
  tmp="$(mktemp -d)"
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "${tmp}/cmdline-tools.zip"
  unzip -q "${tmp}/cmdline-tools.zip" -d "${tmp}/extract"
  rm -rf "${ANDROID_HOME}/cmdline-tools/latest"
  mv "${tmp}/extract/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest"
  rm -rf "${tmp}"
  yes | "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
  "${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager" \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0" \
    "ndk;26.1.10909125" \
    "cmake;3.22.1"
fi

export PATH="${ZIG_HOME}:${PATH}"
