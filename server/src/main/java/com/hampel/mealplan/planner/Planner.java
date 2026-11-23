package com.hampel.mealplan.planner;

import static com.hampel.mealplan.planner.Rules.*;

import com.hampel.mealplan.data.Catalog;
import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.Ing;
import com.hampel.mealplan.model.Meal;
import com.hampel.mealplan.model.PlanTypes.CookAhead;
import com.hampel.mealplan.model.PlanTypes.Cooked;
import com.hampel.mealplan.model.PlanTypes.DayPlan;
import com.hampel.mealplan.model.PlanTypes.DinnerPlan;
import com.hampel.mealplan.model.PlanTypes.FreezeNote;
import com.hampel.mealplan.model.PlanTypes.GroceryItem;
import com.hampel.mealplan.model.PlanTypes.LeftoverUse;
import com.hampel.mealplan.model.PlanTypes.LunchPlan;
import com.hampel.mealplan.model.PlanTypes.Plan;
import com.hampel.mealplan.model.PlanTypes.Serving;
import com.hampel.mealplan.model.Price;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Turns a week of chosen recipes into a full plan: how much to cook, where leftovers go,
 * what to buy, and the cook-ahead and freezer notes. Pure logic, no web or storage code.
 */
public final class Planner {
    private final Catalog catalog;

    public Planner(Catalog catalog) { this.catalog = catalog; }

    public Catalog catalog() { return catalog; }

    public static boolean isBasic(String key, Price p) {
        return BASIC_KEYS.contains(key) || (p != null && BASIC_AISLES.contains(p.aisle()));
    }

    /** How many servings to cook so the anchor protein uses whole packages. */
    public int dinnerServings(Meal meal, int people) {
        if (meal.anchor() == null) return people;
        Ing ing = meal.ingredients().stream().filter(i -> meal.anchor().equals(i.key())).findFirst().orElse(null);
        Price p = catalog.price(meal.anchor());
        if (ing == null || ing.pkg() == null || ing.pkg() == 0 || p == null) return people;
        double perServing = ing.pkg() / meal.servings();
        int packs = (int) Math.max(1, Math.ceil(people * perServing / p.size() - PKG_TOLERANCE));
        int fits = (int) Math.floor(packs * p.size() / perServing + 1e-6);
        return Math.max(people, Math.min(people + MAX_EXTRA, fits));
    }

    // ------------------------------------------------------------------ derive

    /** One use of an ingredient on a given meal, used for freezer notes. */
    record Use(int day, Slot slot, double amt) {}

    private static final class Need {
        double amt;
        final Set<String> usedBy = new LinkedHashSet<>();
    }

    private static int order(int day, Slot slot) { return day * 3 + slot.ordinal(); }

    /**
     * Build the plan for a week.
     *
     * @param have price keys you already have; "!key" marks a pantry basic you need to buy
     */
    public Plan derive(Choices choices, Settings s, Set<String> have) {
        int n = s.people();
        Serving[] breakfasts = new Serving[7];
        LunchPlan[] lunches = new LunchPlan[7];
        DinnerPlan[] dinners = new DinnerPlan[7];
        List<Cooked> cooked = new ArrayList<>();
        int[] lunchNeed = new int[7];
        List<List<LeftoverUse>> lunchLeft = new ArrayList<>();
        for (int d = 0; d < 7; d++) {
            lunchNeed[d] = s.slots().lunch()[d] ? n : 0;
            lunchLeft.add(new ArrayList<>());
        }

        // dinners first, so their extra portions can fill lunches later in the week
        for (int d = 0; d < 7; d++) {
            Meal m = s.slots().dinner()[d] ? catalog.meal(choices.dinner()[d]) : null;
            if (m == null) continue;
            int servings = dinnerServings(m, n);
            int extra = servings - n;
            List<Integer> extraTo = new ArrayList<>();
            for (int d2 = d + 1; d2 <= Math.min(6, d + LEFTOVER_DAYS) && extra > 0; d2++) {
                int take = Math.min(extra, lunchNeed[d2]);
                if (take > 0) {
                    lunchNeed[d2] -= take;
                    extra -= take;
                    lunchLeft.get(d2).add(new LeftoverUse(d, m.id(), take));
                    extraTo.add(d2);
                }
            }
            dinners[d] = new DinnerPlan(m.id(), servings, servings - n, extraTo, extra);
            cooked.add(new Cooked(d, Slot.DINNER, m.id(), servings));
        }
        for (int d = 0; d < 7; d++) {
            String b = s.slots().breakfast()[d] ? choices.breakfast()[d] : null;
            if (b != null && catalog.meal(b) != null) {
                breakfasts[d] = new Serving(b, n);
                cooked.add(new Cooked(d, Slot.BREAKFAST, b, n));
            }
            if (s.slots().lunch()[d]) {
                String l = choices.lunch()[d];
                Serving staple = null;
                if (lunchNeed[d] > 0 && l != null && catalog.meal(l) != null) {
                    staple = new Serving(l, lunchNeed[d]);
                    cooked.add(new Cooked(d, Slot.LUNCH, l, lunchNeed[d]));
                }
                lunches[d] = new LunchPlan(lunchLeft.get(d), staple);
            }
        }

        // groceries: add up every ingredient, then round to whole packages
        Map<String, Need> need = new LinkedHashMap<>();
        Map<String, List<Use>> uses = new LinkedHashMap<>();
        double[] usedValue = {0};
        List<CookAhead> cookAhead = planCookAhead(cooked);
        for (Cooked c : cooked) {
            Meal m = catalog.meal(c.recipeId());
            double f = (double) c.servings() / m.servings();
            List<CookAhead> ahead = cookAhead.stream().filter(a -> a.forDay() == c.day() && a.forSlot() == c.slot()).toList();
            for (Ing i : m.allIngredients()) {
                if (i.cost() != null && i.cost() != 0) usedValue[0] += i.cost() * f; // homemade blends
                if (i.key() == null || i.pkg() == null || i.isBlend()) continue;
                // these come from an earlier meal instead
                if (i.key().equals(COOKED_CHICKEN) && ahead.stream().anyMatch(a -> a.kind().equals("chicken"))) continue;
                if (RICE.contains(i.key()) && ahead.stream().anyMatch(a -> a.kind().equals("rice"))) continue;
                add(need, uses, usedValue, i.key(), i.pkg() * f, m.name(), c.day(), c.slot());
            }
        }
        // extras are bought and cooked with the earlier meal
        for (CookAhead a : cookAhead) {
            Price p = catalog.price(a.rawKey());
            double amt = p != null && "lb".equals(p.unit()) ? a.rawOz() / 16 : a.rawOz();
            add(need, uses, usedValue, a.rawKey(), amt, catalog.meal(a.forRecipe()).name(), a.day(), a.slot());
        }
        Map<String, String> subs = mergeChicken(need, uses);

        List<GroceryItem> groceries = new ArrayList<>();
        double total = 0;
        for (Map.Entry<String, Need> en : need.entrySet()) {
            String key = en.getKey();
            Need e = en.getValue();
            if (e.amt <= 0) continue;
            Price p = catalog.price(key);
            int packages = (int) Math.max(1, Math.ceil(e.amt / p.size() - PKG_TOLERANCE));
            boolean basic = isBasic(key, p);
            double cost = packages * p.price();
            if (!basic && !have.contains(key)) total += cost;
            if (basic && have.contains("!" + key)) total += cost;
            groceries.add(new GroceryItem(key, p.name(), p.aisle(), basic, e.amt, p.unit(), packages, p.size(),
                    p.price(), cost, List.copyOf(e.usedBy)));
        }
        groceries.sort(Comparator.comparing(GroceryItem::aisle, TextOrder.INSTANCE)
                .thenComparing(GroceryItem::name, TextOrder.INSTANCE));

        List<FreezeNote> freezeNotes = new ArrayList<>();
        for (GroceryItem g : groceries) freezeNotes.addAll(freezePlan(g, uses.getOrDefault(g.key(), List.of())));

        List<DayPlan> days = new ArrayList<>();
        int unused = 0;
        for (int d = 0; d < 7; d++) {
            days.add(new DayPlan(breakfasts[d], lunches[d], dinners[d]));
            if (dinners[d] != null) unused += dinners[d].unused();
        }
        return new Plan(days, cooked, groceries, freezeNotes, cookAhead, subs, round2(total), round2(usedValue[0]), unused);
    }

    private void add(Map<String, Need> need, Map<String, List<Use>> uses, double[] usedValue,
                     String key, double amt, String who, int day, Slot slot) {
        Price p = catalog.price(key);
        if (p == null) return;
        Need e = need.computeIfAbsent(key, k -> new Need());
        e.amt += amt;
        e.usedBy.add(who);
        uses.computeIfAbsent(key, k -> new ArrayList<>()).add(new Use(day, slot, amt));
        usedValue[0] += amt * p.price() / p.size();
    }

    static double round2(double x) { return Math.round(x * 100) / 100.0; }

    // ------------------------------------------------------------------ one kind of chicken

    /** Buy one kind of chicken for the whole week, whichever pack covers it for less. */
    private Map<String, String> mergeChicken(Map<String, Need> need, Map<String, List<Use>> uses) {
        List<String> present = CHICKEN_GROUP.stream().filter(need::containsKey).toList();
        Map<String, String> subs = new LinkedHashMap<>();
        if (present.isEmpty()) return subs;
        double totalLb = 0;
        for (String k : present) totalLb += need.get(k).amt * lbPerUnit(k);
        final double lb = totalLb;
        List<String> options = new ArrayList<>(CHICKEN_BUY.stream().filter(k -> catalog.price(k) != null).toList());
        options.sort(Comparator.comparingDouble(k -> chickenCost(k, lb)));
        String buy = options.get(0);
        Need merged = new Need();
        List<Use> mergedUses = new ArrayList<>();
        for (String k : present) {
            Need e = need.get(k);
            double f = lbPerUnit(k) / lbPerUnit(buy);
            merged.amt += e.amt * f;
            merged.usedBy.addAll(e.usedBy);
            for (Use u : uses.getOrDefault(k, List.of())) mergedUses.add(new Use(u.day(), u.slot(), u.amt() * f));
            need.remove(k);
            uses.remove(k);
            if (!k.equals(buy)) subs.put(k, buy);
        }
        need.put(buy, merged);
        uses.put(buy, mergedUses);
        return subs;
    }

    private double lbPerUnit(String key) { return "lb".equals(catalog.price(key).unit()) ? 1 : 1.0 / 16; }

    private double chickenCost(String key, double totalLb) {
        Price p = catalog.price(key);
        return Math.max(1, Math.ceil(totalLb / (p.size() * lbPerUnit(key)) - PKG_TOLERANCE)) * p.price();
    }

    // ------------------------------------------------------------------ cook once, use twice

    /**
     * Meals that can use something cooked earlier: cooked chicken instead of a rotisserie chicken,
     * leftover protein (fried rice, ramen), and day-old rice. Each takes it from the nearest earlier meal.
     */
    private List<CookAhead> planCookAhead(List<Cooked> cooked) {
        List<Cooked> sorted = new ArrayList<>(cooked);
        sorted.sort(Comparator.comparingInt(c -> order(c.day(), c.slot())));
        List<CookAhead> out = new ArrayList<>();
        for (Cooked c : sorted) {
            Meal m = catalog.meal(c.recipeId());
            double f = (double) c.servings() / m.servings();
            List<Cooked> earlier = new ArrayList<>(sorted.stream().filter(o -> order(o.day(), o.slot()) < order(c.day(), c.slot())).toList());
            Collections.reverse(earlier);
            double want = 0;
            for (Ing i : m.allIngredients()) if (COOKED_CHICKEN.equals(i.key())) want += (i.pkg() != null ? i.pkg() : 0) * f;

            if (want > 0) {
                Cooked src = earlier.stream().filter(o -> firstKeyIn(catalog.meal(o.recipeId()), RAW_CHICKEN) != null).findFirst().orElse(null);
                if (src == null) continue;
                String rawKey = firstKeyIn(catalog.meal(src.recipeId()), RAW_CHICKEN);
                double cookedOz = want * COOKED_OZ_PER_CHICKEN;
                out.add(new CookAhead("chicken", src.day(), src.slot(), src.recipeId(), c.day(), c.slot(), c.recipeId(),
                        rawKey, cookedOz / RAW_TO_COOKED, cookedOz, c.day() - src.day() > COOKED_FRIDGE_DAYS));
            } else if (LEFTOVER_PROTEIN.containsKey(m.id())) {
                LeftoverProtein rule = LEFTOVER_PROTEIN.get(m.id());
                Cooked src = earlier.stream().filter(o -> {
                    String a = catalog.meal(o.recipeId()).anchor();
                    return o.slot() == Slot.DINNER && c.day() - o.day() <= rule.maxDays() && a != null
                            && PROTEIN_OK.contains(a) && catalog.price(a) != null;
                }).findFirst().orElse(null);
                if (src != null) {
                    String rawKey = catalog.meal(src.recipeId()).anchor();
                    double cookedOz = rule.oz() * f;
                    double ratio = rawKey.equals("tofu") ? 1 : RAW_TO_COOKED; // tofu barely shrinks
                    out.add(new CookAhead("protein", src.day(), src.slot(), src.recipeId(), c.day(), c.slot(), c.recipeId(),
                            rawKey, cookedOz / ratio, cookedOz, c.day() - src.day() > COOKED_FRIDGE_DAYS));
                }
            }
            if (DAY_OLD_RICE.contains(m.id())) {
                Ing riceIng = m.ingredients().stream().filter(i -> i.key() != null && RICE.contains(i.key())).findFirst().orElse(null);
                // an earlier day's meal that already cooks rice
                Cooked src = earlier.stream().filter(o -> o.day() < c.day() && firstKeyIn(catalog.meal(o.recipeId()), RICE) != null)
                        .findFirst().orElse(null);
                if (riceIng != null && riceIng.pkg() != null && riceIng.pkg() != 0 && src != null) {
                    String rawKey = firstKeyIn(catalog.meal(src.recipeId()), RICE);
                    double dryOz = riceIng.pkg() * f; // rice prices are per oz of dry rice
                    out.add(new CookAhead("rice", src.day(), src.slot(), src.recipeId(), c.day(), c.slot(), c.recipeId(),
                            rawKey, dryOz, dryOz * 3, c.day() - src.day() > COOKED_FRIDGE_DAYS));
                }
            }
        }
        return out;
    }

    private static String firstKeyIn(Meal m, List<String> keys) {
        for (Ing i : m.ingredients()) if (i.key() != null && keys.contains(i.key())) return i.key();
        return null;
    }

    // ------------------------------------------------------------------ freezer notes

    /**
     * Walk through the week's uses of one ingredient. Once opened it keeps for `days`. If the
     * next use is further out than that, freeze what's left; if nothing uses it later and a
     * meaningful amount is left, freeze the extra.
     */
    private static List<FreezeNote> freezePlan(GroceryItem g, List<Use> list) {
        Freezer.Info info = Freezer.info(g.key());
        List<FreezeNote> notes = new ArrayList<>();
        if (info == null || g.basic() || list.isEmpty()) return notes;
        List<Use> sorted = new ArrayList<>(list);
        sorted.sort(Comparator.comparingInt(u -> order(u.day(), u.slot())));
        // merge uses of the same meal (an ingredient can appear twice in one recipe)
        List<double[]> merged = new ArrayList<>(); // {day, slotOrdinal, amt}
        for (Use u : sorted) {
            double[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            if (last != null && last[0] == u.day() && last[1] == u.slot().ordinal()) last[2] += u.amt();
            else merged.add(new double[] {u.day(), u.slot().ordinal(), u.amt()});
        }
        double remaining = g.packages() * g.size();
        int opened = (int) merged.get(0)[0];
        for (int k = 0; k < merged.size(); k++) {
            double[] u = merged.get(k);
            remaining -= u[2];
            if (remaining <= 0) break;
            double[] next = k + 1 < merged.size() ? merged.get(k + 1) : null;
            if (next != null && next[0] - opened <= info.days()) continue;
            boolean worthIt = remaining >= g.size() * 0.15 && remaining * g.price() / g.size() >= 0.5;
            if (next == null && !worthIt) continue;
            if (next != null && remaining < g.size() * 0.03) continue;
            notes.add(new FreezeNote((int) u[0], Slot.values()[(int) u[1]], g.key(), remaining, g.unit(),
                    next != null ? (int) next[0] : null, info.how()));
            if (next != null) opened = (int) next[0]; // thawed for that meal, so the clock restarts
        }
        return notes;
    }
}
