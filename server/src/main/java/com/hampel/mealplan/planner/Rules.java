package com.hampel.mealplan.planner;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The knobs that shape a plan. Change these to change how the planner behaves;
 * the tests in PlannerMatchesTypeScriptTest will show what a change affected.
 */
public final class Rules {
    private Rules() {}

    public static final String[] DAYS = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};

    // ---- scaling and leftovers ----
    /** Extra dinner portions cooked so a protein uses whole packages. */
    public static final int MAX_EXTRA = 2;
    /** Leftovers are eaten as lunch within this many days. */
    public static final int LEFTOVER_DAYS = 3;
    /** At most this many dinners a week with the same main protein. */
    public static final int MAX_SAME_PROTEIN = 2;
    /** 16.4 oz of a 16 oz pack still counts as one pack. */
    public static final double PKG_TOLERANCE = 0.03;
    /** Recipes making more than this many servings (batch recipes) aren't planned yet. */
    public static final int MAX_RECIPE_SERVINGS = 4;

    // ---- pantry basics: listed, but not counted toward the total unless marked as needed ----
    public static final Set<String> BASIC_AISLES = Set.of("Spices", "Baking & Oils");
    public static final Set<String> BASIC_KEYS = Set.of(
            "soy sauce", "rice vinegar", "balsamic vinegar", "red wine vinegar", "white wine vinegar", "cider vinegar",
            "worcestershire", "hot sauce", "sriracha", "mayonnaise", "dijon mustard", "yellow mustard", "honey",
            "maple syrup", "sesame oil", "bouillon paste", "beef bouillon paste", "vegetable bouillon paste");

    // ---- one kind of chicken per week ----
    /** Breasts, boneless thighs and cutlets swap freely in these recipes. */
    public static final List<String> CHICKEN_GROUP = List.of("chicken breast", "chicken thighs boneless", "chicken cutlets");
    /** Packs we'd actually buy for the group (whichever covers the week for less). */
    public static final List<String> CHICKEN_BUY = List.of("chicken breast", "chicken thighs boneless");

    // ---- cook once, use twice ----
    public static final String COOKED_CHICKEN = "rotisserie chicken";
    /** Meat from one rotisserie chicken, matching how recipes were priced. */
    public static final double COOKED_OZ_PER_CHICKEN = 24;
    /** Boneless meat loses about a quarter of its weight cooking. */
    public static final double RAW_TO_COOKED = 0.75;
    public static final List<String> RAW_CHICKEN = CHICKEN_GROUP;
    /** Cooked extras keep this long in the fridge; longer gaps get a freeze note. */
    public static final int COOKED_FRIDGE_DAYS = 3;

    /** Recipes that take leftover protein: cooked oz for the base servings, and how many days back it can come from. */
    public record LeftoverProtein(double oz, int maxDays) {}
    public static final Map<String, LeftoverProtein> LEFTOVER_PROTEIN = Map.of(
            "fried-rice", new LeftoverProtein(8, 7),
            "upgraded-ramen", new LeftoverProtein(3, 2)); // a quick lunch: only from a recent dinner

    /** Recipes that want rice cooked a day or more ahead. */
    public static final Set<String> DAY_OLD_RICE = Set.of("fried-rice");
    public static final List<String> RICE = List.of("jasmine rice", "white rice", "basmati rice");
    /** Proteins that work as leftovers in fried rice or ramen. */
    public static final Set<String> PROTEIN_OK = Set.of("chicken breast", "chicken thighs boneless", "chicken cutlets",
            "ground beef", "ground pork", "ground turkey", "pork chops", "pork butt", "steak", "ribeye", "shrimp", "tofu");

    // ---- choosing a week ----
    /** Random weeks tried before polishing. */
    public static final int SAMPLES = 150;
    /** How many of those get polished one meal at a time. */
    public static final int POLISH = 4;
    /** Polishing passes over the week. */
    public static final int MAX_PASSES = 3;
    /** Each dollar over budget counts this much against a plan. */
    public static final double OVER_BUDGET_WEIGHT = 4;
    /** Penalty per dinner portion with no lunch to go to. */
    public static final double UNUSED_PORTION_PENALTY = 2;
}
