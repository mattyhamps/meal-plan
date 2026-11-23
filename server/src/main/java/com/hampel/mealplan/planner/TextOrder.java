package com.hampel.mealplan.planner;

import java.util.Comparator;

/**
 * Sorts names the way the app's original JavaScript did (Unicode's default collation, simplified
 * for plain ASCII): spaces, then punctuation, then digits, then letters, ignoring case; ties go
 * lowercase first. Java's built-in Collator skips spaces, which put "Romaine" before "Roma tomato".
 */
final class TextOrder implements Comparator<String> {
    static final TextOrder INSTANCE = new TextOrder();
    private static final String PUNCT = " _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$";

    private TextOrder() {}

    private static int weight(char c) {
        int p = PUNCT.indexOf(c);
        if (p >= 0) return p;
        if (c >= '0' && c <= '9') return 100 + (c - '0');
        char l = Character.toLowerCase(c);
        if (l >= 'a' && l <= 'z') return 200 + (l - 'a');
        return 300 + l; // anything else after letters
    }

    @Override
    public int compare(String a, String b) {
        int n = Math.min(a.length(), b.length());
        for (int i = 0; i < n; i++) {
            int d = Integer.compare(weight(a.charAt(i)), weight(b.charAt(i)));
            if (d != 0) return d;
        }
        if (a.length() != b.length()) return Integer.compare(a.length(), b.length());
        for (int i = 0; i < n; i++) { // same letters: lowercase sorts first
            boolean ua = Character.isUpperCase(a.charAt(i)), ub = Character.isUpperCase(b.charAt(i));
            if (ua != ub) return ua ? 1 : -1;
        }
        return 0;
    }
}
