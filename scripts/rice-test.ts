import { readFileSync } from 'node:fs';
import { derive, defaultSettings, emptyChoices, DAYS, generate } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const s = defaultSettings(2, 115); s.slots.breakfast=Array(7).fill(false); s.slots.lunch=Array(7).fill(false);
for (const first of ['sweet-chili-pork-cabbage-stir-fry','teriyaki-tofu','mexican-chicken-rice-bowls']) {
  const c = emptyChoices(); c.dinner[0]=first; c.dinner[2]='fried-rice';
  const p = derive(c, s, data);
  console.log(first, p.cookAhead.map(a=>`${a.kind} ${a.rawKey} raw ${a.rawOz.toFixed(1)}oz ${DAYS[a.day]}→${DAYS[a.forDay]}`), p.total);
}
const c = emptyChoices(); c.dinner[2]='fried-rice'; console.log('alone', derive(c,s,data).cookAhead.length);
let n=0,f=0; for (let seed=1;seed<40;seed++){const g=generate(defaultSettings(2,115),data,new Set(),seed); if(g.choices.dinner.includes('fried-rice')){f++; if(g.plan.cookAhead.some(a=>a.kind==='protein')) n++;}}
console.log('plans with fried rice', f, 'using leftover protein', n);
