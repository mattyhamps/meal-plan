package com.hampel.mealplan.data;

import com.hampel.mealplan.model.Meal;
import com.hampel.mealplan.model.Price;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads the bundled JSON in src/main/resources/data (rebuilt by data-source/export_app_data.py).
 */
public final class DataLoader {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private DataLoader() {}

    public static Catalog loadCatalog() {
        List<Meal> meals = read("meals.json", new TypeReference<List<Meal>>() {});
        Map<String, Price> prices = read("prices.json", new TypeReference<LinkedHashMap<String, Price>>() {});
        return Catalog.of(meals, prices);
    }

    /** Raw JSON (blends, store info) passed through to the app as-is. */
    public static Object raw(String file) {
        return read(file, new TypeReference<Object>() {});
    }

    private static <T> T read(String file, TypeReference<T> type) {
        try (InputStream in = DataLoader.class.getResourceAsStream("/data/" + file)) {
            if (in == null) throw new IllegalStateException("Missing data file: " + file);
            return JSON.readValue(in, type);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
