#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/ensure-toolchain.sh
source "${ROOT}/scripts/ensure-toolchain.sh"
bash "${ROOT}/scripts/ensure-zero-native.sh"

cd "${ROOT}/third_party/zero-native"
zig build test-examples-mobile

cd "${ROOT}/samples/zero-native/desktop"
zig build test

echo "zero-native checks passed"
