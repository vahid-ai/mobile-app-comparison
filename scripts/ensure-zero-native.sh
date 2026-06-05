#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRAMEWORK_DIR="${ROOT}/third_party/zero-native"
PATCH="${ROOT}/patches/zero-native-android.patch"

if [[ ! -d "${FRAMEWORK_DIR}/.git" ]]; then
  mkdir -p "${ROOT}/third_party"
  git clone --depth 1 https://github.com/vercel-labs/zero-native.git "${FRAMEWORK_DIR}"
fi

if ! git -C "${FRAMEWORK_DIR}" apply --check "${PATCH}" >/dev/null 2>&1; then
  if git -C "${FRAMEWORK_DIR}" apply --reverse --check "${PATCH}" >/dev/null 2>&1; then
    echo "zero-native Android patch already applied"
  else
    echo "Applying zero-native Android patch..."
    git -C "${FRAMEWORK_DIR}" apply "${PATCH}"
  fi
else
  echo "Applying zero-native Android patch..."
  git -C "${FRAMEWORK_DIR}" apply "${PATCH}"
fi
