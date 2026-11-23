package com.hampel.mealplan.model;

/** One store product: a package of `size` `unit`s for `price` dollars. */
public record Price(double size, String unit, double price, String name, String aisle, boolean pantry) {}
