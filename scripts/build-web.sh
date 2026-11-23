#!/usr/bin/env bash
# Build the web version of the app into app/dist. The server serves it, so the app calls the API
# on the same address (that's why EXPO_PUBLIC_API_URL is empty). Re-run after changing app code.
set -euo pipefail
cd "$(dirname "$0")/../app"
EXPO_PUBLIC_API_URL= npx expo export --platform web
