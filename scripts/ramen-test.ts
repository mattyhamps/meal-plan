import { readFileSync } from 'node:fs';
import { derive, defaultSettings, emptyChoices, DAYS } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const s = defaultSettings(2, 115); s.slots.breakfast=Array(7).fill(false);
const c = emptyChoices(); c.dinner[0]='sweet-chili-pork-cabbage-stir-fry'; for (let d=0; d<7; d++) c.lunch[d]='upgraded-ramen';
s.slots.dinner=[true,false,false,false,false,false,false];
const p = derive(c, s, data);
console.log(p.cookAhead.map(a=>`${a.kind} ${a.rawKey} ${a.rawOz.toFixed(1)}oz ${DAYS[a.day]}→${DAYS[a.forDay]} ${a.forSlot} freeze=${a.freeze}`));
