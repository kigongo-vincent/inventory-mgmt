#!/usr/bin/env bash
# Publish a JS/asset update to EAS Update (default: production channel, all platforms).
# Optional: first argument is the update message if it does not start with "--".
# Env: EAS_UPDATE_CHANNEL, EAS_UPDATE_PLATFORM, EAS_UPDATE_MESSAGE override defaults.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
CHANNEL="${EAS_UPDATE_CHANNEL:-production}"
PLATFORM="${EAS_UPDATE_PLATFORM:-all}"
MESSAGE="${EAS_UPDATE_MESSAGE:-}"
if [ -z "$MESSAGE" ] && [ "${1:-}" != "" ] && [[ "${1:-}" != --* ]]; then
  MESSAGE="$1"
  shift
fi
if [ -z "$MESSAGE" ]; then
  MESSAGE="Update $(date -u +%Y-%m-%dT%H:%MZ)"
fi
exec npx eas-cli update --channel "$CHANNEL" --platform "$PLATFORM" --message "$MESSAGE" "$@"
