package com.hampel.mealplan.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** The three meals of a day, in the order they're eaten. */
public enum Slot {
    BREAKFAST("Breakfast"), LUNCH("Lunch"), DINNER("Dinner");

    private final String mealType;

    Slot(String mealType) { this.mealType = mealType; }

    /** The recipe type that fills this slot ("Breakfast", "Lunch" or "Dinner"). */
    public String mealType() { return mealType; }

    @JsonValue
    public String json() { return name().toLowerCase(); }

    @JsonCreator
    public static Slot fromJson(String s) { return valueOf(s.toUpperCase()); }
}
