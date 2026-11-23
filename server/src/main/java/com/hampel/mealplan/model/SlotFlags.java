package com.hampel.mealplan.model;

/** Which days (Mon..Sun) each meal is planned. */
public record SlotFlags(boolean[] breakfast, boolean[] lunch, boolean[] dinner) {
    public boolean[] get(Slot s) {
        return switch (s) { case BREAKFAST -> breakfast; case LUNCH -> lunch; case DINNER -> dinner; };
    }

    public SlotFlags with(Slot s, boolean[] days) {
        return new SlotFlags(s == Slot.BREAKFAST ? days : breakfast, s == Slot.LUNCH ? days : lunch,
                s == Slot.DINNER ? days : dinner);
    }
}
