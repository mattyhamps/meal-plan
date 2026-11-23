package com.hampel.mealplan.model;

/** The recipe id chosen for each meal of each day (Mon..Sun); null where nothing is planned. */
public record Choices(String[] breakfast, String[] lunch, String[] dinner) {
    public String[] get(Slot s) {
        return switch (s) { case BREAKFAST -> breakfast; case LUNCH -> lunch; case DINNER -> dinner; };
    }

    /** A copy with one slot's days replaced. */
    public Choices with(Slot s, String[] days) {
        return new Choices(s == Slot.BREAKFAST ? days : breakfast, s == Slot.LUNCH ? days : lunch,
                s == Slot.DINNER ? days : dinner);
    }

    public static Choices empty() { return new Choices(new String[7], new String[7], new String[7]); }
}
