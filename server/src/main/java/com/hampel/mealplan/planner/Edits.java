package com.hampel.mealplan.planner;

import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.PlanTypes.Moved;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import java.util.Arrays;

/** Small changes to a week: swapping a recipe in, or moving a dinner to another day. */
public final class Edits {
    private Edits() {}

    /**
     * Put a recipe in a slot. Swapping a breakfast or lunch staple changes every day that had the
     * same staple, since you shop for them together.
     */
    public static Choices applySwap(Choices choices, int day, Slot slot, String recipeId) {
        String[] cur = choices.get(slot);
        String[] next = Arrays.copyOf(cur, cur.length);
        if (slot == Slot.DINNER) {
            next[day] = recipeId;
        } else {
            String old = cur[day];
            for (int d = 0; d < next.length; d++) if (d == day || (old != null && old.equals(cur[d]))) next[d] = recipeId;
        }
        return choices.with(slot, next);
    }

    /** Trade two days' dinners. A day with no dinner planned trades its night off too. */
    public static Moved moveDinner(Choices choices, Settings s, int from, int to) {
        String[] dinner = Arrays.copyOf(choices.dinner(), 7);
        String t = dinner[from];
        dinner[from] = dinner[to];
        dinner[to] = t;
        boolean[] on = Arrays.copyOf(s.slots().dinner(), 7);
        boolean b = on[from];
        on[from] = on[to];
        on[to] = b;
        return new Moved(choices.with(Slot.DINNER, dinner), s.withSlots(s.slots().with(Slot.DINNER, on)));
    }
}
