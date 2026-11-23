import { readFileSync } from 'node:fs';
import { generate, defaultSettings, mealIndex, DAYS, amountText } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const ix = mealIndex(data);
for (const [n,b] of [[1,90],[2,115],[4,175]]) {
  const s = defaultSettings(n, b); s.slots.dinner[4]=false;
  const g = generate(s, data, new Set(), 8);
  console.log(`\n== ${n} people`);
  for (const f of g.plan.freezeNotes) {
    const d = g.plan.days[f.day];
    const meal = f.slot==='dinner'? d.dinner?.recipeId : f.slot==='lunch'? d.lunch?.staple?.recipeId : d.breakfast?.recipeId;
    console.log(DAYS[f.day], f.slot, '|', ix[meal!].name, '→ freeze', amountText(f.amount,f.unit,f.key), f.nextDay!=null?`(needed ${DAYS[f.nextDay]})`:'');
  }
}
