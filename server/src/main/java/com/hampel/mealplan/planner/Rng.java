package com.hampel.mealplan.planner;

import java.util.ArrayList;
import java.util.List;

/**
 * Small seeded random generator (xorshift32). The same seed always gives the same plan,
 * which keeps "New plan" reproducible and makes the planner testable.
 */
public final class Rng {
    private int s;

    public Rng(long seed) {
        int v = (int) seed;
        s = v == 0 ? 1 : v;
    }

    /** A number in [0, 1). */
    public double next() {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return Integer.toUnsignedLong(s) / 4294967296.0;
    }

    /** A shuffled copy (Fisher-Yates). */
    public <T> List<T> shuffle(List<T> a) {
        List<T> b = new ArrayList<>(a);
        for (int i = b.size() - 1; i > 0; i--) {
            int j = (int) Math.floor(next() * (i + 1));
            T t = b.get(i);
            b.set(i, b.get(j));
            b.set(j, t);
        }
        return b;
    }
}
