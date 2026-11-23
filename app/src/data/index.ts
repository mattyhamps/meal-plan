// Recipes, prices and blends come from the planner server when the app starts (see loadData).
// These objects are filled in place, so screens can import them directly.
import { api } from '../api';
import type { Data } from '../types';

export type Blend = {
  id: string; name: string; kind: string; packetSize?: string;
  perPacket?: (string | { item: string; qty: number; unit: string })[];
  jarRatioParts?: Record<string, number>;
  batch?: string[]; method?: string; buy?: string; source?: string;
};

export const data: Data = { meals: [], prices: {} };
export const blends: Record<string, Blend> = {};
export const meta: { store: { name?: string; address?: string }; asOf: string } = { store: {}, asOf: '' };

export async function loadData() {
  const d = await api.data();
  data.meals = d.meals; // a new array, so cached lookups rebuild
  data.prices = d.prices;
  for (const b of d.blends as Blend[]) blends[b.id] = b;
  meta.store = d.store;
  meta.asOf = d.asOf;
}

// Starting budgets, set a bit above the cheapest week the planner can find for each household size
// when you're buying everything except pantry basics.
export const suggestedBudget: Record<number, number> = { 1: 90, 2: 115, 3: 140, 4: 175 };
