package com.hampel.mealplan.api;

import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import java.util.List;

/** Request bodies for the plan endpoints. `have` lists price keys you already have ("!key" = a basic you need). */
public final class Requests {
    private Requests() {}

    public record GenerateRequest(Settings settings, List<String> have, long seed) {}

    public record DeriveRequest(Settings settings, Choices choices, List<String> have) {}

    public record SwapsRequest(Settings settings, Choices choices, List<String> have, int day, Slot slot, long seed,
                               Integer count) {}

    public record SwapRequest(Choices choices, int day, Slot slot, String recipeId) {}

    public record MoveRequest(Settings settings, Choices choices, int from, int to) {}
}
