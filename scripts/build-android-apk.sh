#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/ensure-toolchain.sh
source "${ROOT}/scripts/ensure-toolchain.sh"
bash "${ROOT}/scripts/ensure-zero-native.sh"
"${ROOT}/scripts/build-android-lib.sh"

ANDROID_DIR="${ROOT}/third_party/zero-native/examples/android"
GRADLE_HOME="${GRADLE_HOME:-${HOME}/.local/gradle-8.7}"

if [[ ! -x "${GRADLE_HOME}/bin/gradle" ]]; then
  echo "Installing Gradle 8.7 to ${GRADLE_HOME}..."
  tmp="$(mktemp)"
  curl -fsSL "https://services.gradle.org/distributions/gradle-8.7-bin.zip" -o "${tmp}"
  unzip -q "${tmp}" -d "${HOME}/.local"
  rm -f "${tmp}"
fi

export PATH="${GRADLE_HOME}/bin:${PATH}"
cd "${ANDROID_DIR}"

if [[ ! -x ./gradlew ]]; then
  gradle wrapper --gradle-version 8.7
fi

./gradlew :app:assembleDebug --no-daemon
ls -lh app/build/outputs/apk/debug/app-debug.apk
