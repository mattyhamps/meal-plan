# Meal Plan

Plans a week of meals on a budget, using ACME Havertown prices. The phone app shows the plan;
a Java server does the planning.

```
app/          Expo (React Native + web) app: screens, display formatting, saved settings
server/       Spring Boot (Java 21) planner and API
data-source/  recipe bank, store prices, and the script that builds the server's data
```

## Run it on GitHub (Codespaces)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/mattyhamps/meal-plan)

1. Click the button above (or **Code › Codespaces › Create codespace on main** on the repo page).
2. Wait for setup. The first time takes a few minutes while it installs packages and builds the app.
3. The app opens in a new tab on port 8080. If it doesn't, open the **Ports** tab and click the globe next to "Meal Plan".

While the codespace is running:
- **After changing Java code:** run `bash scripts/start.sh` in the terminal to restart the server.
- **After changing app code:** run `bash scripts/build-web.sh`, then reload the page.
- **On your phone:** open the same port 8080 address. You'll need to be signed in to GitHub there, or set the port to Public in the Ports tab (right-click › Port Visibility) to share it with someone else.
- The codespace stops after a while idle. Reopen it from **Code › Codespaces**; the server starts again on its own.

## Run it on your computer

You need Java 21 and Node 20+.

1. Start the server (first run downloads dependencies):
   ```
   cd server
   ./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
   ```
   It listens on http://localhost:8080. Check it with http://localhost:8080/api/data.

2. In another terminal, start the app:
   ```
   cd app
   npm install
   npx expo start --web            # in a browser
   npx expo start                  # scan the QR code with Expo Go on your iPhone
   ```

**On your phone:** the phone can't see `localhost` on your computer. Use your computer's Wi-Fi address,
with the phone on the same Wi-Fi:
```
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080 npx expo start
```
(On Windows PowerShell: `$env:EXPO_PUBLIC_API_URL="http://192.168.1.20:8080"; npx expo start`.)

## Where things are

**Server (`server/src/main/java/com/hampel/mealplan/`)**
- `planner/Rules.java`: the knobs. Leftover days, extra portions, budget weight, which recipes take leftover protein, and so on.
- `planner/Planner.java`: turns chosen recipes into a plan: servings, leftovers, groceries, cook-ahead and freezer notes.
- `planner/Generator.java`: picks a week that fits the budget (random weeks, then polishes the best few).
- `planner/Swaps.java`, `planner/Edits.java`: swap suggestions, swapping a recipe in, and moving dinners.
- `planner/Freezer.java`: what freezes well and how long things keep.
- `api/PlanController.java`: the REST API the app calls.
- `src/main/resources/data/`: meals, prices and blends (built by `data-source/export_app_data.py`).

**App (`app/src/`)**
- `screens/`: Week setup, Plan, Groceries, Recipe.
- `state.ts`: saved settings and plan; calls the server through `api.ts`.
- `format.ts`: amounts and wording ("1½ tbsp", "about 2 breasts").

## API

All plan endpoints are `POST` with JSON and keep no state; the app sends its settings and choices each time.

| Endpoint | Body | Returns |
|---|---|---|
| `GET /api/data` | | meals, prices (with `basic` flag), blends, store |
| `/api/plan/generate` | `settings, have, seed` | `choices` and full `plan` |
| `/api/plan/derive` | `settings, choices, have` | full `plan` |
| `/api/plan/swaps` | `settings, choices, have, day, slot, seed` | 3 alternatives with price change |
| `/api/plan/swap` | `choices, day, slot, recipeId` | new `choices` |
| `/api/plan/move` | `settings, choices, from, to` | new `choices` and `settings` |

## Tests

```
cd server && ./mvnw test
```
`PlannerMatchesGoldenTest` checks the planner against saved results for a few hundred sample weeks
(first made by the original TypeScript planner). When you change the planner on purpose, it lists the
weeks that changed. If the new results are what you want, save them:
```
./mvnw test -Dgolden.update=true
```

App checks: `cd app && npx tsc --noEmit && npx expo lint`.

## Recipe and price data

- `data-source/recipe-bank.json`: the full recipe bank (Notion recipes, HelloFresh cards rewritten in our own words, staples, spice blends).
- `data-source/prices_havertown.txt`: ACME Havertown prices (`key|size|unit|price|product`), checked 2026-11-19.
- `data-source/cost.py`: unit conversions from recipe amounts to store packages.
- `data-source/export_app_data.py`: rebuilds `server/src/main/resources/data/*.json`: `python3 data-source/export_app_data.py`.

See `ROADMAP.md` for what's planned next.
