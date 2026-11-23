package com.hampel.mealplan;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hampel.mealplan.data.DataLoader;
import com.hampel.mealplan.model.Choices;
import com.hampel.mealplan.model.Settings;
import com.hampel.mealplan.model.Slot;
import com.hampel.mealplan.planner.Edits;
import com.hampel.mealplan.planner.Generator;
import com.hampel.mealplan.planner.Planner;
import com.hampel.mealplan.planner.Swaps;
import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Checks the planner against saved results ("golden files") in src/test/resources/golden.
 * They were first made by the original TypeScript planner, so the Java port could be shown to
 * behave the same.
 *
 * <p>After you change the planner on purpose, these tests show which weeks changed. If the new
 * results are what you want, save them as the new golden files with:
 * <pre>./mvnw test -Dgolden.update=true</pre>
 */
class PlannerMatchesGoldenTest {
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final boolean UPDATE = Boolean.getBoolean("golden.update");

    private final Planner planner = new Planner(DataLoader.loadCatalog());
    private final Generator generator = new Generator(planner);
    private final Swaps swaps = new Swaps(planner, generator);

    @Test
    void derive() {
        check("derive", c -> planner.derive(choices(c), settings(c), have(c)));
    }

    @Test
    void generate() {
        check("generate", c -> generator.generate(settings(c), have(c), c.get("seed").asLong()));
    }

    @Test
    void swaps() {
        check("swaps", c -> swaps.options(choices(c), c.get("day").asInt(), slot(c), settings(c), have(c),
                c.get("seed").asLong(), 3));
    }

    @Test
    void applySwap() {
        check("apply-swap", c -> Edits.applySwap(choices(c), c.get("day").asInt(), slot(c), c.get("recipeId").asString()));
    }

    @Test
    void moveDinner() {
        check("move", c -> Edits.moveDinner(choices(c), settings(c), c.get("from").asInt(), c.get("to").asInt()));
    }

    // ---------------------------------------------------------------- helpers

    private void check(String name, Function<JsonNode, Object> run) {
        ArrayNode cases = (ArrayNode) read(name);
        List<String> failures = new ArrayList<>();
        for (int i = 0; i < cases.size(); i++) {
            JsonNode c = cases.get(i);
            JsonNode actual = JSON.valueToTree(run.apply(c));
            if (UPDATE) {
                ((ObjectNode) c).set("expected", actual);
                continue;
            }
            String diff = firstDifference("", c.get("expected"), actual);
            if (diff != null) failures.add("case " + i + ": " + diff);
        }
        if (UPDATE) {
            JSON.writeValue(new File("src/test/resources/golden/" + name + ".json"), cases);
            return;
        }
        assertTrue(failures.isEmpty(), failures.size() + " of " + cases.size() + " " + name + " cases differ, e.g.\n"
                + String.join("\n", failures.subList(0, Math.min(5, failures.size()))));
    }

    private static JsonNode read(String name) {
        try (InputStream in = PlannerMatchesGoldenTest.class.getResourceAsStream("/golden/" + name + ".json")) {
            return JSON.readTree(in);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static Settings settings(JsonNode c) { return JSON.treeToValue(c.get("settings"), Settings.class); }

    private static Choices choices(JsonNode c) { return JSON.treeToValue(c.get("choices"), Choices.class); }

    private static Slot slot(JsonNode c) { return Slot.fromJson(c.get("slot").asString()); }

    private static Set<String> have(JsonNode c) {
        Set<String> out = new HashSet<>();
        if (c.has("have")) for (JsonNode h : c.get("have")) out.add(h.asString());
        return out;
    }

    /** Where two JSON trees differ, or null. Numbers match within rounding; a missing field equals null. */
    static String firstDifference(String path, JsonNode want, JsonNode got) {
        boolean wantNull = want == null || want.isNull() || want.isMissingNode();
        boolean gotNull = got == null || got.isNull() || got.isMissingNode();
        if (wantNull || gotNull) return wantNull == gotNull ? null : path + ": expected " + want + " but got " + got;
        if (want.isNumber() && got.isNumber()) {
            double a = want.doubleValue(), b = got.doubleValue();
            return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)) ? null : path + ": expected " + a + " but got " + b;
        }
        if (want.isArray() && got.isArray()) {
            if (want.size() != got.size()) return path + ": expected " + want.size() + " items but got " + got.size();
            for (int i = 0; i < want.size(); i++) {
                String d = firstDifference(path + "[" + i + "]", want.get(i), got.get(i));
                if (d != null) return d;
            }
            return null;
        }
        if (want.isObject() && got.isObject()) {
            Set<String> keys = new HashSet<>();
            for (Map.Entry<String, JsonNode> e : want.properties()) keys.add(e.getKey());
            for (Map.Entry<String, JsonNode> e : got.properties()) keys.add(e.getKey());
            for (String k : keys.stream().sorted().toList()) {
                String d = firstDifference(path + "." + k, want.get(k), got.get(k));
                if (d != null) return d;
            }
            return null;
        }
        return want.equals(got) ? null : path + ": expected " + want + " but got " + got;
    }
}
