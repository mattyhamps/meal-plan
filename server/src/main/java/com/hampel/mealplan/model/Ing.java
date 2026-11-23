package com.hampel.mealplan.model;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One ingredient line in a recipe.
 *
 * @param key  price key (e.g. "ground beef"), "blend:..." for homemade blends, or null if not bought
 * @param pkg  amount in the store package's unit (e.g. lb for ground beef) at the recipe's base servings
 * @param cost cost of a homemade blend for this amount
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Ing(String item, double qty, String unit, String key, Double pkg, Double cost) {
    public boolean isBlend() { return key != null && key.startsWith("blend:"); }
}
