import { readFileSync } from 'node:fs';
import { generate, defaultSettings } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
let rice=0, veg=0, n=0;
for (let seed=1; seed<60; seed++) for (const p of [1,2,4]) {
  const g = generate(defaultSettings(p,[0,90,115,0,175][p]), data, new Set(), seed); n++;
  const keys = g.plan.groceries.map(x=>x.key);
  if (keys.filter(k=>['jasmine rice','white rice','basmati rice'].includes(k)).length>1) rice++;
  if (keys.includes('frozen peas and carrots')) veg++;
}
console.log(n,'plans; more than one rice:',rice,'; peas&carrots bag:',veg);
