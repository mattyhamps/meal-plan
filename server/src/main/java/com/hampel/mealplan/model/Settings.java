package com.hampel.mealplan.model;

/**
 * What the person asked for.
 *
 * @param people household size, 1-4
 * @param budget weekly grocery budget in dollars
 * @param easy   prefer quick or easy dinners
 */
public record Settings(int people, double budget, boolean easy, SlotFlags slots) {
    public Settings withSlots(SlotFlags s) { return new Settings(people, budget, easy, s); }
}
