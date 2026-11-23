import { readFileSync } from 'node:fs';
import { generate, defaultSettings } from '../src/planner';
const data = { meals: JSON.parse(readFileSync('src/data/meals.json','utf8')), prices: JSON.parse(readFileSync('src/data/prices.json','utf8')) };
for (const n of [1,2,3,4]) {
  const floor = [1,2,3].map(seed => generate(defaultSettings(n, 1), data, new Set(), seed).plan.total);
  const typical = [1,2,3,4,5].map(seed => generate(defaultSettings(n, 400), data, new Set(), seed).plan.total);
  console.log(n, 'cheapest', floor, 'no-budget', typical);
}
