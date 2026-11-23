package com.hampel.mealplan.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * A recipe the planner can use.
 *
 * @param anchor  the protein whose package size decides how many servings to cook (or null)
 * @param protein main protein, used to avoid too many of the same one in a week
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Meal(
        String id, String name, String type, int servings,
        Integer prep, Integer cook, Integer inactive, Integer calories,
        List<String> tags, boolean easy, String source, String anchor, String protein,
        Map<String, Object> freezer,
        List<Ing> ingredients, List<Ing> pantry, List<String> steps, List<String> blends, String note) {

    /** Ingredients followed by pantry items, the order recipes list them. */
    public List<Ing> allIngredients() {
        List<Ing> all = new ArrayList<>(ingredients);
        all.addAll(pantry);
        return all;
    }

    public String proteinOrId() { return protein != null ? protein : id; }
}
