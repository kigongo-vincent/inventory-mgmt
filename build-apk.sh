#!/usr/bin/env bash
# Build an Android APK on EAS (production channel for OTA updates).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec npx eas-cli build --platform android --profile apk --clear-cache "$@"
