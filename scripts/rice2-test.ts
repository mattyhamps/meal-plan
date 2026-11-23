import { readFileSync } from 'node:fs';
import { derive, defaultSettings, emptyChoices, DAYS } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const s = defaultSettings(2, 115); s.slots.breakfast=Array(7).fill(false); s.slots.lunch=Array(7).fill(false);
const c = emptyChoices(); c.dinner[0]='sweet-chili-pork-cabbage-stir-fry'; c.dinner[2]='fried-rice';
const p = derive(c, s, data);
console.log(p.cookAhead.map(a=>`${a.kind} ${a.rawKey} ${a.rawOz.toFixed(1)}oz ${DAYS[a.day]}→${DAYS[a.forDay]}`));
const rice = p.groceries.find(g=>g.key==='jasmine rice')!; console.log('rice need', rice.needed.toFixed(1), 'uses', rice.usedBy);
const c2 = emptyChoices(); c2.dinner[2]='fried-rice'; console.log('alone:', derive(c2,s,data).cookAhead.length, derive(c2,s,data).groceries.find(g=>g.key==='jasmine rice')!.needed.toFixed(1));
