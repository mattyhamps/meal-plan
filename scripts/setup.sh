#!/usr/bin/env bash
# One-time setup: install app packages, build the web app, and download the server's dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."
(cd app && npm ci)
bash scripts/build-web.sh
(cd server && ./mvnw -q -DskipTests package)
echo "Setup done. Start everything with: bash scripts/start.sh"
