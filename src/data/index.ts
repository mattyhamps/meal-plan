import mealsJson from './meals.json';
import pricesJson from './prices.json';
import blendsJson from './blends.json';
import metaJson from './meta.json';
import type { Data, Meal, Price } from '../planner';

export type Blend = {
  id: string; name: string; kind: string; packetSize?: string;
  perPacket?: (string | { item: string; qty: number; unit: string })[];
  jarRatioParts?: Record<string, number>;
  batch?: string[]; method?: string; buy?: string; source?: string;
};

export const data: Data = { meals: mealsJson as unknown as Meal[], prices: pricesJson as Record<string, Price> };
export const blends: Record<string, Blend> = Object.fromEntries((blendsJson as Blend[]).map(b => [b.id, b]));
export const store = metaJson.store as { name?: string; address?: string };
export const pricesAsOf: string = metaJson.asOf;

// Starting budgets, set a bit above the cheapest week the planner can find for each household size
// when you're buying everything except pantry basics.
export const suggestedBudget: Record<number, number> = { 1: 90, 2: 115, 3: 140, 4: 175 };
