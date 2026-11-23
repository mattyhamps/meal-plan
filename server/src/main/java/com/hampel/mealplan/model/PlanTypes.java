package com.hampel.mealplan.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/** Everything a planned week contains. Field names match what the app reads. */
public final class PlanTypes {
    private PlanTypes() {}

    public record LeftoverUse(int fromDay, String recipeId, int portions) {}

    public record Cooked(int day, Slot slot, String recipeId, int servings) {}

    public record Serving(String recipeId, int servings) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record LunchPlan(List<LeftoverUse> leftovers, Serving staple) {}

    /** @param extraTo days whose lunch gets the extra portions; unused = portions with no lunch to go to */
    public record DinnerPlan(String recipeId, int servings, int extra, List<Integer> extraTo, int unused) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record DayPlan(Serving breakfast, LunchPlan lunch, DinnerPlan dinner) {}

    public record GroceryItem(String key, String name, String aisle, boolean basic, double needed, String unit,
                              int packages, double size, double price, double cost, List<String> usedBy) {}

    /** @param nextDay set when some of it is needed again later in the week */
    public record FreezeNote(int day, Slot slot, String key, double amount, String unit, Integer nextDay, String how) {}

    /**
     * Cook extra with an earlier meal for a later one.
     *
     * @param kind "chicken" (replaces a rotisserie chicken), "protein" (leftover protein) or "rice" (day-old rice)
     */
    public record CookAhead(String kind, int day, Slot slot, String fromRecipe, int forDay, Slot forSlot,
                            String forRecipe, String rawKey, double rawOz, double cookedOz, boolean freeze) {}

    /**
     * @param subs  recipe ingredient key -> what we're buying instead this week
     * @param total cost of the packages to buy (not pantry basics or things you have)
     */
    public record Plan(List<DayPlan> days, List<Cooked> cooked, List<GroceryItem> groceries,
                       List<FreezeNote> freezeNotes, List<CookAhead> cookAhead, Map<String, String> subs,
                       double total, double usedValue, int unusedPortions) {}

    public record Generated(Choices choices, Plan plan) {}

    public record SwapOption(String recipeId, double total, double delta) {}

    public record Moved(Choices choices, Settings settings) {}
}
