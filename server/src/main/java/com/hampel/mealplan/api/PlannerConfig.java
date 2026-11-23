package com.hampel.mealplan.api;

import com.hampel.mealplan.data.Catalog;
import com.hampel.mealplan.data.DataLoader;
import com.hampel.mealplan.planner.Generator;
import com.hampel.mealplan.planner.Planner;
import com.hampel.mealplan.planner.Swaps;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class PlannerConfig implements WebMvcConfigurer {
    /** Which web pages may call the API. "*" is fine while it only serves your own app. */
    @Value("${mealplan.allowed-origins:*}")
    private String[] allowedOrigins;

    @Bean
    Catalog catalog() { return DataLoader.loadCatalog(); }

    @Bean
    Planner planner(Catalog catalog) { return new Planner(catalog); }

    @Bean
    Generator generator(Planner planner) { return new Generator(planner); }

    @Bean
    Swaps swaps(Planner planner, Generator generator) { return new Swaps(planner, generator); }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(allowedOrigins).allowedMethods("GET", "POST");
    }
}
