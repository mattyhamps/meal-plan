package com.hampel.mealplan.api;

import com.hampel.mealplan.api.Requests.DeriveRequest;
import com.hampel.mealplan.api.Requests.GenerateRequest;
import com.hampel.mealplan.api.Requests.MoveRequest;
import com.hampel.mealplan.api.Requests.SwapRequest;
import com.hampel.mealplan.api.Requests.SwapsRequest;
import com.hampel.mealplan.data.Catalog;
import com.hampel.mealplan.data.DataLoader;
import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.PlanTypes.Generated;
import com.hampel.mealplan.model.PlanTypes.Moved;
import com.hampel.mealplan.model.PlanTypes.Plan;
import com.hampel.mealplan.model.PlanTypes.SwapOption;
import com.hampel.mealplan.model.Price;
import com.hampel.mealplan.planner.Edits;
import com.hampel.mealplan.planner.Generator;
import com.hampel.mealplan.planner.Planner;
import com.hampel.mealplan.planner.Swaps;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The API the app calls. Everything is stateless: the app sends its settings and choices each time. */
@RestController
@RequestMapping("/api")
public class PlanController {
    private final Catalog catalog;
    private final Planner planner;
    private final Generator generator;
    private final Swaps swaps;
    private final Map<String, Object> data;

    public PlanController(Catalog catalog, Planner planner, Generator generator, Swaps swaps) {
        this.catalog = catalog;
        this.planner = planner;
        this.generator = generator;
        this.swaps = swaps;
        this.data = buildData();
    }

    /** Recipes, prices, spice blends and store info for the app's screens. */
    @GetMapping("/data")
    public Map<String, Object> data() { return data; }

    /** Make a new week. */
    @PostMapping("/plan/generate")
    public Generated generate(@RequestBody GenerateRequest r) {
        return generator.generate(r.settings(), have(r.have()), r.seed());
    }

    /** The full plan (servings, leftovers, groceries, notes) for a week of chosen recipes. */
    @PostMapping("/plan/derive")
    public Plan derive(@RequestBody DeriveRequest r) {
        return planner.derive(r.choices(), r.settings(), have(r.have()));
    }

    /** A few alternatives for one meal, with how each changes the total. */
    @PostMapping("/plan/swaps")
    public List<SwapOption> swaps(@RequestBody SwapsRequest r) {
        return swaps.options(r.choices(), r.day(), r.slot(), r.settings(), have(r.have()), r.seed(),
                r.count() != null ? r.count() : 3);
    }

    /** Put a recipe in a slot. */
    @PostMapping("/plan/swap")
    public Choices swap(@RequestBody SwapRequest r) {
        return Edits.applySwap(r.choices(), r.day(), r.slot(), r.recipeId());
    }

    /** Move a dinner to another day (trading places with what's there). */
    @PostMapping("/plan/move")
    public Moved move(@RequestBody MoveRequest r) {
        return Edits.moveDinner(r.choices(), r.settings(), r.from(), r.to());
    }

    private static Set<String> have(List<String> have) { return have == null ? Set.of() : new HashSet<>(have); }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildData() {
        Map<String, Object> prices = new LinkedHashMap<>();
        for (Map.Entry<String, Price> e : catalog.prices().entrySet()) {
            Price p = e.getValue();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("size", p.size());
            row.put("unit", p.unit());
            row.put("price", p.price());
            row.put("name", p.name());
            row.put("aisle", p.aisle());
            row.put("pantry", p.pantry());
            row.put("basic", Planner.isBasic(e.getKey(), p)); // listed but not counted unless marked needed
            prices.put(e.getKey(), row);
        }
        Map<String, Object> meta = (Map<String, Object>) DataLoader.raw("meta.json");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("meals", catalog.meals());
        out.put("prices", prices);
        out.put("blends", DataLoader.raw("blends.json"));
        out.put("store", meta.get("store"));
        out.put("asOf", meta.get("asOf"));
        return out;
    }
}
