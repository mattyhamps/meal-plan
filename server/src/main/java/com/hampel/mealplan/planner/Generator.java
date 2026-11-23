package com.hampel.mealplan.planner;

import static com.hampel.mealplan.planner.Rules.*;

import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.Meal;
import com.hampel.mealplan.model.PlanTypes.Generated;
import com.hampel.mealplan.model.PlanTypes.GroceryItem;
import com.hampel.mealplan.model.PlanTypes.Plan;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Picks a week: tries many random weeks, polishes the most promising few one meal at a time,
 * then picks a varied one that fits the budget (or the cheapest if none does).
 */
public final class Generator {
    private final Planner planner;

    public Generator(Planner planner) { this.planner = planner; }

    /** Recipes that can fill a slot, honoring "keep it easy". */
    public List<Meal> pool(Slot slot, Settings s) {
        // batch recipes (energy balls, banana bread, 8 burritos) don't fit a one-day slot yet
        List<Meal> p = planner.catalog().meals().stream()
                .filter(m -> m.type().equals(slot.mealType()) && m.servings() <= MAX_RECIPE_SERVINGS).toList();
        if (s.easy()) {
            List<Meal> easy = p.stream().filter(Meal::easy).toList();
            int needed = 0;
            for (boolean on : s.slots().get(slot)) if (on) needed++;
            if (easy.size() >= Math.min(needed, 3)) p = easy;
        }
        return p;
    }

    private Choices randomChoices(Settings s, Rng r) {
        String[] dinner = new String[7];
        // dinners: all different, limited repeats of the same protein
        List<Meal> dinners = r.shuffle(pool(Slot.DINNER, s));
        Map<String, Integer> proteinCount = new HashMap<>();
        int k = 0;
        for (int d = 0; d < 7; d++) {
            if (!s.slots().dinner()[d]) continue;
            while (k < dinners.size()) {
                Meal m = dinners.get(k++);
                String pr = m.proteinOrId();
                if (proteinCount.getOrDefault(pr, 0) >= MAX_SAME_PROTEIN) continue;
                proteinCount.merge(pr, 1, Integer::sum);
                dinner[d] = m.id();
                break;
            }
        }
        Choices out = Choices.empty().with(Slot.DINNER, dinner);
        // breakfasts and lunches: two staples that alternate, like a real week
        for (Slot slot : List.of(Slot.BREAKFAST, Slot.LUNCH)) {
            List<Meal> p = r.shuffle(pool(slot, s));
            if (p.isEmpty()) continue;
            List<Meal> pick = p.subList(0, Math.min(2, p.size()));
            String[] days = new String[7];
            int i = 0;
            for (int d = 0; d < 7; d++) if (s.slots().get(slot)[d]) days[d] = pick.get(i++ % pick.size()).id();
            out = out.with(slot, days);
        }
        return out;
    }

    /** Lower is better: being over budget hurts most, then food bought but not eaten. */
    static double objective(Plan p, double budget) {
        return Math.max(0, p.total() - budget) * OVER_BUDGET_WEIGHT + wasteScore(p);
    }

    /** Money spent on food that doesn't get eaten this week, plus a penalty for orphan portions. */
    public static double wasteScore(Plan p) {
        double bought = 0, used = 0;
        for (GroceryItem g : p.groceries()) if (!g.basic()) bought += g.cost();
        for (GroceryItem g : p.groceries()) if (!g.basic()) used += g.needed() * g.price() / g.size();
        return bought - used + p.unusedPortions() * UNUSED_PORTION_PENALTY;
    }

    private boolean dinnerAllowed(Choices choices, int day, Meal m, Settings s) {
        int same = 0;
        for (int d = 0; d < 7; d++) {
            if (d == day || !s.slots().dinner()[d] || choices.dinner()[d] == null) continue;
            Meal o = planner.catalog().meal(choices.dinner()[d]);
            if (o.id().equals(m.id())) return false;
            if (o.proteinOrId().equals(m.proteinOrId())) same++;
        }
        return same < MAX_SAME_PROTEIN;
    }

    private record Move(Slot slot, int day) {}

    /** Improve a week one meal at a time until no single change helps. */
    private Generated improve(Choices start, Settings s, Set<String> have, Rng r) {
        Choices choices = start;
        Plan plan = planner.derive(choices, s, have);
        double score = objective(plan, s.budget());
        Map<Slot, List<Meal>> pools = new EnumMap<>(Slot.class);
        for (Slot slot : Slot.values()) pools.put(slot, pool(slot, s));
        for (int pass = 0; pass < MAX_PASSES; pass++) {
            boolean improved = false;
            List<Move> moves = new ArrayList<>();
            for (Slot slot : Slot.values())
                for (int d = 0; d < 7; d++) if (s.slots().get(slot)[d] && choices.get(slot)[d] != null) moves.add(new Move(slot, d));
            for (Move mv : r.shuffle(moves)) {
                Slot slot = mv.slot();
                int d = mv.day();
                // staples change as a group, so only try the first day of each group
                if (slot != Slot.DINNER && indexOf(choices.get(slot), choices.get(slot)[d]) != d) continue;
                for (Meal m : r.shuffle(pools.get(slot))) {
                    if (m.id().equals(choices.get(slot)[d])) continue;
                    if (slot == Slot.DINNER && !dinnerAllowed(choices, d, m, s)) continue;
                    if (slot != Slot.DINNER && indexOf(choices.get(slot), m.id()) >= 0) continue;
                    Choices next = Edits.applySwap(choices, d, slot, m.id());
                    Plan p = planner.derive(next, s, have);
                    double sc = objective(p, s.budget());
                    if (sc < score - 0.01) {
                        choices = next;
                        plan = p;
                        score = sc;
                        improved = true;
                    }
                }
            }
            if (!improved) break;
        }
        return new Generated(choices, plan);
    }

    private static int indexOf(String[] a, String v) {
        for (int i = 0; i < a.length; i++) if (v == null ? a[i] == null : v.equals(a[i])) return i;
        return -1;
    }

    private record Candidate(Choices choices, Plan plan, double score) {}

    public Generated generate(Settings s, Set<String> have, long seed) {
        Rng r = new Rng(seed);
        List<Candidate> cands = new ArrayList<>();
        for (int t = 0; t < SAMPLES; t++) {
            Choices choices = randomChoices(s, r);
            Plan plan = planner.derive(choices, s, have);
            cands.add(new Candidate(choices, plan, objective(plan, s.budget())));
        }
        cands.sort(Comparator.comparingDouble(Candidate::score));
        // polish a mix of the best and some random ones so results don't all look alike
        List<Candidate> starts = new ArrayList<>();
        starts.add(cands.get(0));
        List<Candidate> others = r.shuffle(cands.subList(1, Math.min(30, cands.size())));
        starts.addAll(others.subList(0, Math.min(POLISH - 1, others.size())));
        List<Generated> done = new ArrayList<>();
        for (Candidate c : starts) done.add(improve(c.choices(), s, have, r));
        List<Generated> under = done.stream().filter(g -> g.plan().total() <= s.budget()).toList();
        if (!under.isEmpty()) return under.get((int) Math.floor(r.next() * under.size()));
        List<Generated> sortedDone = new ArrayList<>(done);
        sortedDone.sort(Comparator.comparingDouble(g -> g.plan().total()));
        return sortedDone.get(0);
    }

    static String[] copy(String[] a) { return Arrays.copyOf(a, a.length); }
}
