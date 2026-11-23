# Meal Plan (v1)

Budget meal planner built with Expo (React Native + web). Data lives on the device.

## Run it
```
npm install
npx expo start --web      # in a browser
npx expo start            # scan the QR code with Expo Go on your iPhone
```

## Where things are
- `src/planner.ts` – all planning logic (scaling to whole packages, leftovers to lunches, budget search, swaps, grocery rounding). No UI code.
- `src/data/*.json` – meals, ACME Havertown prices, spice blends (generated from `recipe-bank.json`).
- `src/state.ts` – saved settings and plan (AsyncStorage).
- `src/screens/` – Week setup, Plan, Groceries, Recipe.
- `scripts/test-planner.ts` – prints sample weeks for 1–4 people: `node scripts/test-planner.ts`.

## Recipe and price data
- `data-source/recipe-bank.json` – the full recipe bank (Notion recipes, HelloFresh cards rewritten in our own words, staples, spice blends).
- `data-source/prices_havertown.txt` – ACME Havertown prices (`key|size|unit|price|product`), checked 2026-11-19.
- `data-source/cost.py` – unit conversions from recipe amounts to store packages.
- `data-source/export_app_data.py` – rebuilds `src/data/*.json` from the files above: `python3 data-source/export_app_data.py`.

See `ROADMAP.md` for what's planned after v1.

## Checks
```
npx tsc --noEmit
npx expo lint
```
