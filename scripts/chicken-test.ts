import { readFileSync } from 'node:fs';
import { generate, defaultSettings } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
let multi=0, withChicken=0;
for (let seed=1; seed<60; seed++) for (const n of [1,2,4]) {
  const g = generate(defaultSettings(n,[0,90,115,0,175][n]), data, new Set(), seed);
  const ch = g.plan.groceries.filter(x=>['chicken breast','chicken thighs boneless','chicken cutlets'].includes(x.key));
  if (ch.length) withChicken++; if (ch.length>1) multi++;
  if (seed<3 && ch.length) console.log(n, ch.map(x=>`${x.key} ${x.packages}x needs ${x.needed.toFixed(2)}${x.unit}`), g.plan.subs, g.plan.total);
}
console.log('plans with chicken', withChicken, 'with more than one kind', multi);
