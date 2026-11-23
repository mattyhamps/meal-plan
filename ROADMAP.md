# Roadmap (not in v1)

## Next up: your picks
- **Favorite recipes.** Let people mark recipes they like (a heart on the recipe page or in Swap). Favorites show up more often in new plans.
  - Planner idea: add a weight in `Generator.randomChoices` and a small bonus in `Generator.objective`, so favorites win ties without blowing the budget.
- **"I'm in the mood for…" (must include).** Let people pin a recipe so the next plan always includes it, on a day they pick or any day.
  - Planner idea: fill pinned meals first in `Generator.randomChoices`, and never let `Generator.improve` swap them out. Clear pins after the plan is made, or ask.
  - If a pinned meal pushes the plan over budget, say so instead of dropping it.

## Deferred from v1 scoping
- Focus modes besides budget: nutrition, "something unique"
- Leftovers: choose to freeze them or move them to a dinner (today they go to lunch automatically)
- Frozen-meal inventory: use meals you froze earlier as future meals
- Pair small amounts across recipes on purpose (beyond the chicken, protein and rice cook-ahead)
- Show the waste for each plan
- Second store (ACME South Street) and store picker
- Desserts, appetizers and sides in the planner
- Diets and allergies
- Batch recipes (energy balls, banana bread, freezer burritos, pasta salad) that cover several days
- "Choose any" meal list in Swap (beyond the 3 suggestions)
- Same breakfast every day setting
- App Store release (needs an Apple developer account and EAS Build)
- Host the Java server online (so the app works away from your Wi-Fi), with accounts and sync
