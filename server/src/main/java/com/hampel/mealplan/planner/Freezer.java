package com.hampel.mealplan.planner;

import java.util.HashMap;
import java.util.Map;

/**
 * How long an opened ingredient keeps in the fridge (or on the counter, for bread), and how
 * to freeze what's left. Only ingredients that freeze reasonably well are listed.
 */
public final class Freezer {
    private Freezer() {}

    public record Info(int days, String how) {}

    private static final Info MEAT = new Info(2, "Wrap tightly or bag it flat; keeps 3 months. Thaw overnight in the fridge.");
    private static final Info SEAFOOD = new Info(1, "Bag it airtight; keeps 3 months. Thaw overnight in the fridge.");
    private static final Info BREAD = new Info(7, "Bag it; keeps 3 months. Toast or warm straight from frozen.");
    private static final Info TORTILLA = new Info(7, "Bag with parchment between them; keeps 3 months.");
    private static final Info SHRED = new Info(7, "Bag it; keeps 3 months. Best melted, not raw.");
    private static final Info CAN = new Info(5, "Freeze in a container or ice-cube tray; keeps 3 months.");

    private static final Map<String, Info> TABLE = new HashMap<>();
    private static void put(Info info, String... keys) { for (String k : keys) TABLE.put(k, info); }

    static {
        put(MEAT, "ground beef", "ground turkey", "ground pork", "italian sausage", "chorizo", "breakfast sausage",
                "chicken breast", "chicken thighs boneless", "chicken thighs bone-in", "chicken cutlets", "chicken wings",
                "pork chops", "pork butt", "steak", "ribeye");
        put(SEAFOOD, "salmon", "shrimp");
        put(new Info(3, "Pull the meat off and bag it; keeps 3 months."), "rotisserie chicken");
        put(new Info(4, "Bag slices flat; keeps 2 months. Best in hot sandwiches after."), "deli turkey");
        put(new Info(5, "Bag slices flat with parchment between; keeps 2 months."), "prosciutto");
        put(new Info(3, "Freeze in water in a container; texture gets chewier, great for stir-fries."), "tofu");
        put(new Info(7, "Freeze in an ice-cube tray; use in cooking, not whipping."), "heavy cream");
        put(new Info(7, "Freeze in an ice-cube tray for cooking."), "half and half");
        put(new Info(5, "Freeze in a container; use in baked dishes after."), "ricotta");
        put(SHRED, "cheddar shredded", "mexican cheese", "mozzarella shredded", "monterey jack");
        put(BREAD, "sandwich bread", "sourdough bread", "brioche buns", "potato buns", "ciabatta", "english muffins", "pitas");
        put(new Info(2, "Slice and bag it; keeps 3 months. Warm in the oven from frozen."), "baguette");
        put(TORTILLA, "flour tortillas", "large flour tortillas", "corn tortillas");
        put(new Info(3, "Freeze on a tray, then bag; cook straight from frozen."), "ravioli");
        put(CAN, "chicken broth", "vegetable broth", "coconut milk", "diced tomatoes", "fire roasted tomatoes",
                "crushed tomatoes", "tomato sauce", "marinara", "pizza sauce", "black beans", "chickpeas");
        put(new Info(5, "Freeze in tablespoon blobs on parchment, then bag."), "tomato paste");
        put(new Info(7, "Freeze each pepper with a little sauce in an ice-cube tray."), "chipotle in adobo");
        put(new Info(4, "Bag it; use frozen in cooking or smoothies, not salads."), "spinach");
        put(new Info(7, "Peel, slice and bag; great for smoothies or banana bread."), "banana");
        put(new Info(5, "Dice and bag; use in cooked dishes."), "bell pepper", "red bell pepper");
        put(new Info(14, "Freeze whole; grate it straight from frozen."), "ginger");
    }

    /** Freezing info, or null if it doesn't freeze well. */
    public static Info info(String key) { return TABLE.get(key); }
}
