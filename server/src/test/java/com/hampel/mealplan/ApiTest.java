package com.hampel.mealplan;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** The endpoints the app calls answer with the shapes it expects. */
@SpringBootTest
@AutoConfigureMockMvc
class ApiTest {
    private static final String SETTINGS = """
            {"people":2,"budget":115,"easy":false,"slots":{
              "breakfast":[true,true,true,true,true,true,true],
              "lunch":[true,true,true,true,true,true,true],
              "dinner":[true,true,true,true,false,true,true]}}""";

    @Autowired MockMvc mvc;

    @Test
    void dataHasMealsPricesAndBlends() throws Exception {
        mvc.perform(get("/api/data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meals.length()").value(79))
                .andExpect(jsonPath("$.prices['ground beef'].unit").value("lb"))
                .andExpect(jsonPath("$.prices['salt'].basic").value(true))
                .andExpect(jsonPath("$.store.name").value("ACME Havertown"));
    }

    @Test
    void generateMakesAWeekWithoutFridayDinner() throws Exception {
        mvc.perform(post("/api/plan/generate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"settings\":" + SETTINGS + ",\"have\":[],\"seed\":42}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.choices.dinner.length()").value(7))
                .andExpect(jsonPath("$.choices.dinner[4]").doesNotExist())
                .andExpect(jsonPath("$.plan.days.length()").value(7))
                .andExpect(jsonPath("$.plan.total").isNumber());
    }

    @Test
    void moveTradesDinnersAndNightsOff() throws Exception {
        String choices = """
                {"breakfast":[null,null,null,null,null,null,null],"lunch":[null,null,null,null,null,null,null],
                 "dinner":["fried-rice","teriyaki-tofu",null,null,null,null,null]}""";
        mvc.perform(post("/api/plan/move").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"settings\":" + SETTINGS + ",\"choices\":" + choices + ",\"from\":0,\"to\":4}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.choices.dinner[4]").value("fried-rice"))
                .andExpect(jsonPath("$.settings.slots.dinner[0]").value(false))
                .andExpect(jsonPath("$.settings.slots.dinner[4]").value(true));
    }
}
