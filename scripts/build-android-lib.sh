#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/ensure-toolchain.sh
source "${ROOT}/scripts/ensure-toolchain.sh"
bash "${ROOT}/scripts/ensure-zero-native.sh"

FRAMEWORK_DIR="${ROOT}/third_party/zero-native"
LIB_OUT="${FRAMEWORK_DIR}/examples/android/app/src/main/cpp/lib/libzero-native.a"

cd "${FRAMEWORK_DIR}"
zig build lib -Dtarget=aarch64-linux-android -Doptimize=ReleaseFast
mkdir -p "$(dirname "${LIB_OUT}")"
cp zig-out/lib/libzero-native.a "${LIB_OUT}"
ls -lh "${LIB_OUT}"
