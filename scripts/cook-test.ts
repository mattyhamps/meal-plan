import { readFileSync } from 'node:fs';
import { derive, defaultSettings, emptyChoices, mealIndex, DAYS, generate } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
const ix = mealIndex(data);
const bowls = data.meals.find((m:any)=>m.name.startsWith('Mexican Chicken'))!.id;
const pie = data.meals.find((m:any)=>m.name==='Mini Chicken Pot Pies')!.id;
const s = defaultSettings(2, 115); s.slots.breakfast=Array(7).fill(false); s.slots.lunch=Array(7).fill(false);
const c = emptyChoices(); c.dinner[0]=bowls; c.dinner[3]=pie;
const p = derive(c, s, data);
console.log(p.cookAhead);
console.log(p.groceries.filter(g=>g.key.includes('chicken')).map(g=>[g.key,g.packages,g.needed.toFixed(2)]), 'total', p.total);
const c2 = emptyChoices(); c2.dinner[3]=pie; const p2 = derive(c2, s, data);
console.log('pie alone groceries chicken:', p2.groceries.filter(g=>g.key.includes('chicken')).map(g=>g.key), p2.cookAhead.length);
let n=0; for (let seed=1; seed<30; seed++){ const g=generate(defaultSettings(2,115),data,new Set(),seed); n+=g.plan.cookAhead.length?1:0; }
console.log('plans using cook-ahead out of 29:', n);
