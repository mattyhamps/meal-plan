// Talks to the Java planner server (server/). Set EXPO_PUBLIC_API_URL to point somewhere else,
// e.g. your computer's address on Wi-Fi when testing on a phone: http://192.168.1.20:8080
import type { Choices, Generated, Meal, Plan, Price, Settings, Slot, SwapOption } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Planner server answered ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export type ServerData = {
  meals: Meal[];
  prices: Record<string, Price>;
  blends: unknown[];
  store: { name?: string; address?: string };
  asOf: string;
};

export const api = {
  data: () => call<ServerData>('/api/data'),
  generate: (settings: Settings, have: string[], seed: number) =>
    call<Generated>('/api/plan/generate', { settings, have, seed }),
  derive: (settings: Settings, choices: Choices, have: string[]) =>
    call<Plan>('/api/plan/derive', { settings, choices, have }),
  swaps: (settings: Settings, choices: Choices, have: string[], day: number, slot: Slot, seed: number) =>
    call<SwapOption[]>('/api/plan/swaps', { settings, choices, have, day, slot, seed }),
  swap: (choices: Choices, day: number, slot: Slot, recipeId: string) =>
    call<Choices>('/api/plan/swap', { choices, day, slot, recipeId }),
  move: (settings: Settings, choices: Choices, from: number, to: number) =>
    call<{ choices: Choices; settings: Settings }>('/api/plan/move', { settings, choices, from, to }),
};
