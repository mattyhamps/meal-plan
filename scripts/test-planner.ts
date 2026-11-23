import { readFileSync } from 'node:fs';
import { generate, derive, swapOptions, dinnerServings, defaultSettings, mealIndex, DAYS, wasteScore } from '../src/planner';
const meals = JSON.parse(readFileSync('src/data/meals.json','utf8'));
const prices = JSON.parse(readFileSync('src/data/prices.json','utf8'));
const data = { meals, prices };
const ix = mealIndex(data);
const budgets: Record<number, number> = {1:65,2:120,3:165,4:215};
// scaling example from the spec: 10 oz of a 16 oz pack for 2 people -> 3 servings
const pork = ix['sweet-chili-pork-cabbage-stir-fry'];
console.log('scaling', [1,2,3,4].map(n => dinnerServings(pork, n, prices)));
for (const n of [1,2,3,4]) {
  const s = defaultSettings(n, budgets[n]);
  s.slots.dinner[4] = false; // pizza Friday
  const t0 = Date.now();
  const g = generate(s, data, new Set(), 42);
  const ms = Date.now()-t0;
  const p = g.plan;
  console.log(`\n== ${n} people, budget $${s.budget}: total $${p.total}, waste $${wasteScore(p).toFixed(2)}, unused portions ${p.unusedPortions}, ${ms}ms`);
  p.days.forEach((d, i) => {
    const din = d.dinner ? `${ix[d.dinner.recipeId].name} x${d.dinner.servings}${d.dinner.extraTo.length?' → lunch '+d.dinner.extraTo.map(x=>DAYS[x]).join(','):''}${d.dinner.unused?` (${d.dinner.unused} unused)`:''}` : '—';
    const l = d.lunch ? [...d.lunch.leftovers.map(x=>`leftover ${ix[x.recipeId].name.slice(0,18)} x${x.portions}`), d.lunch.staple?`${ix[d.lunch.staple.recipeId].name} x${d.lunch.staple.servings}`:''].filter(Boolean).join(' + ') : '—';
    console.log(DAYS[i], '| B:', d.breakfast?ix[d.breakfast.recipeId].name:'—', '| L:', l, '| D:', din);
  });
  const top = [...p.groceries].filter(x=>!x.basic).sort((a,b)=>b.cost-a.cost).slice(0,5).map(x=>`${x.key} ${x.packages}x$${x.price}`);
  console.log('items', p.groceries.length, 'basics', p.groceries.filter(x=>x.basic).length, 'top:', top.join('; '));
  const sw = swapOptions(g.choices, 0, 'dinner', s, data, new Set(), 7);
  console.log('swaps Mon dinner:', sw.map(o=>`${ix[o.recipeId].name} (${o.delta>=0?'+':''}${o.delta})`).join(' | '));
}
// tight budget
const s = defaultSettings(2, 70); const g = generate(s, data, new Set(), 1);
console.log('\ntight $70 for 2, full week:', g.plan.total, 'easy:', generate({...s, easy:true, budget:120}, data, new Set(), 3).plan.total);
