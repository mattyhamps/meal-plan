package com.hampel.mealplan.planner;

import static com.hampel.mealplan.planner.Rules.MAX_SAME_PROTEIN;

import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.Meal;
import com.hampel.mealplan.model.PlanTypes.SwapOption;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** The few alternatives offered when someone taps Swap or Change. */
public final class Swaps {
    private final Planner planner;
    private final Generator generator;

    public Swaps(Planner planner, Generator generator) {
        this.planner = planner;
        this.generator = generator;
    }

    public List<SwapOption> options(Choices choices, int day, Slot slot, Settings s, Set<String> have, long seed, int count) {
        String current = choices.get(slot)[day];
        double base = planner.derive(choices, s, have).total();
        Map<String, Integer> usedProteins = new HashMap<>();
        if (slot == Slot.DINNER) {
            for (int d = 0; d < 7; d++) {
                String id = choices.dinner()[d];
                if (id == null || d == day || !s.slots().dinner()[d]) continue;
                Meal m = planner.catalog().meal(id);
                usedProteins.merge(m != null ? m.proteinOrId() : id, 1, Integer::sum);
            }
        }
        List<SwapOption> opts = new ArrayList<>();
        for (Meal m : generator.pool(slot, s)) {
            if (m.id().equals(current)) continue;
            if (slot == Slot.DINNER) {
                boolean alreadyPlanned = false;
                for (int d = 0; d < 7; d++) if (m.id().equals(choices.dinner()[d]) && s.slots().dinner()[d]) alreadyPlanned = true;
                if (alreadyPlanned) continue;
                if (usedProteins.getOrDefault(m.proteinOrId(), 0) >= MAX_SAME_PROTEIN) continue;
            }
            String[] days = Generator.copy(choices.get(slot));
            days[day] = m.id();
            double total = planner.derive(choices.with(slot, days), s, have).total();
            opts.add(new SwapOption(m.id(), total, Planner.round2(total - base)));
        }
        // keep options that stay near the budget, then pick a varied few
        double limit = Math.max(s.budget(), base) + 3;
        List<SwapOption> ok = opts.stream().filter(o -> o.total() <= limit).toList();
        List<SwapOption> picked = new ArrayList<>(new Rng(seed).shuffle(ok).subList(0, Math.min(count, ok.size())));
        if (picked.size() < count) {
            List<SwapOption> rest = new ArrayList<>(opts.stream().filter(o -> picked.stream().noneMatch(p -> p == o)).toList());
            rest.sort(Comparator.comparingDouble(SwapOption::total));
            picked.addAll(rest.subList(0, Math.min(count - picked.size(), rest.size())));
        }
        picked.sort(Comparator.comparingDouble(SwapOption::delta));
        return picked;
    }
}
