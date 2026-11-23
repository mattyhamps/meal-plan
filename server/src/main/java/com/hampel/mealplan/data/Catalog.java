package com.hampel.mealplan.data;

import com.hampel.mealplan.model.Meal;
import com.hampel.mealplan.model.Price;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The recipes and store prices the planner works from. */
public record Catalog(List<Meal> meals, Map<String, Price> prices, Map<String, Meal> byId) {
    public static Catalog of(List<Meal> meals, Map<String, Price> prices) {
        Map<String, Meal> byId = new LinkedHashMap<>();
        for (Meal m : meals) byId.put(m.id(), m);
        return new Catalog(List.copyOf(meals), prices, byId);
    }

    public Meal meal(String id) { return id == null ? null : byId.get(id); }

    public Price price(String key) { return key == null ? null : prices.get(key); }
}
