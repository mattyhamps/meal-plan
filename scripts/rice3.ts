import { readFileSync } from 'node:fs';
import { derive, defaultSettings, emptyChoices } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const s = defaultSettings(2, 115); s.slots.breakfast=Array(7).fill(false); s.slots.lunch=Array(7).fill(false);
const veg = data.meals.find((m:any)=>m.type==='Dinner' && !m.anchor && m.ingredients.some((i:any)=>i.key==='jasmine rice' || i.key==='white rice'))!;
const c = emptyChoices(); c.dinner[0]=veg.id; c.dinner[2]='fried-rice';
console.log(veg.name, derive(c,s,data).cookAhead.map(a=>a.kind));
