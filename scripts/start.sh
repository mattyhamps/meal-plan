#!/usr/bin/env bash
# Start (or restart) the server on port 8080. It serves the API and the web app in app/dist.
# Re-run after changing Java code. The log is in /tmp/mealplan-server.log.
set -uo pipefail
cd "$(dirname "$0")/.."
[ -f app/dist/index.html ] || bash scripts/build-web.sh
pkill -f "spring-boot:run" 2>/dev/null; pkill -f "mealplan-server" 2>/dev/null; sleep 1
cd server
setsid nohup ./mvnw -q spring-boot:run > /tmp/mealplan-server.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  if curl -s -o /dev/null http://localhost:8080/api/data; then
    echo "Meal Plan is running on port 8080."
    exit 0
  fi
  sleep 2
done
echo "The server didn't start in 3 minutes. See /tmp/mealplan-server.log"
exit 1
