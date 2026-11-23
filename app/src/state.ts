import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Choices, Plan, Settings, Slot } from './types';
import { data, loadData, suggestedBudget } from './data';
import { api, API_URL } from './api';

const KEY = 'mealplan:v1';

export type Saved = {
  settings: Settings;
  choices: Choices | null; // null until the first plan is made
  have: string[]; // price keys you already have ("!key" = a pantry basic you need to buy)
  checked: string[]; // grocery items ticked off in the store
  seed: number;
  setupDone: boolean;
  planFor: { people: number; slots: Settings['slots'] } | null; // what the current plan was made for
};

export function defaultSettings(people = 2, budget = 120): Settings {
  return {
    people, budget, easy: false,
    slots: { breakfast: Array(7).fill(true), lunch: Array(7).fill(true), dinner: Array(7).fill(true) },
  };
}

/** Why the saved plan no longer matches the week, or null if it's fine. */
export function staleReason(v: Saved): string | null {
  if (!v.choices) return null;
  if (v.planFor && v.planFor.people !== v.settings.people) {
    return `This plan was made for ${v.planFor.people} ${v.planFor.people === 1 ? 'person' : 'people'}.`;
  }
  if (v.planFor && JSON.stringify(v.planFor.slots) !== JSON.stringify(v.settings.slots)) {
    return 'You changed which meals to plan.';
  }
  const ids = new Set(data.meals.map(m => m.id));
  for (const slot of ['breakfast', 'lunch', 'dinner'] as Slot[]) {
    for (let d = 0; d < 7; d++) {
      if (!v.settings.slots[slot][d]) continue;
      const id = v.choices[slot][d];
      if (!id || !ids.has(id)) return 'Some meals in this plan aren’t available anymore.';
    }
  }
  return null;
}

const initial = (): Saved => ({
  settings: defaultSettings(2, suggestedBudget[2]),
  choices: null, have: [], checked: [], seed: 1, setupDone: false, planFor: null,
});

const swapFlags = (a: boolean[], from: number, to: number) => {
  const b = a.slice();
  [b[from], b[to]] = [b[to], b[from]];
  return b;
};

export function useApp() {
  const [saved, setSaved] = useState<Saved>(initial);
  const savedRef = useRef(saved);
  useEffect(() => { savedRef.current = saved; }, [saved]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const first = useRef(true);

  const fail = (e: unknown) =>
    setError(`Can’t reach the planner server at ${API_URL}. Is it running? (${e instanceof Error ? e.message : String(e)})`);

  const connect = useCallback(() => {
    loadData().then(() => { setDataReady(true); setError(null); }).catch(fail);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setSaved({ ...initial(), ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => setStorageLoaded(true));
    connect();
  }, [connect]);

  useEffect(() => {
    if (!storageLoaded) return;
    if (first.current) { first.current = false; return; }
    AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved, storageLoaded]);

  // ask the server for the full plan whenever the week changes; ignore answers that arrive late
  const planRequest = useRef(0);
  useEffect(() => {
    if (!dataReady || !saved.choices) return;
    const id = ++planRequest.current;
    api.derive(saved.settings, saved.choices, saved.have)
      .then(p => { if (id === planRequest.current) { setPlan(p); setError(null); } })
      .catch(e => { if (id === planRequest.current) fail(e); });
  }, [dataReady, saved.choices, saved.settings, saved.have]);

  const have = useMemo(() => new Set(saved.have), [saved.have]);

  // the plan before the last "new plan", so it can be undone (not saved between visits)
  const [undo, setUndo] = useState<Pick<Saved, 'choices' | 'checked' | 'planFor' | 'seed'> | null>(null);
  const setSettings = useCallback((s: Settings) => setSaved(v => ({ ...v, settings: s })), []);

  const makePlan = useCallback(async () => {
    const v = savedRef.current;
    const seed = (v.seed * 7919 + 17) % 1000003;
    setBusy(true);
    try {
      const g = await api.generate(v.settings, v.have, seed);
      setUndo(v.choices ? { choices: v.choices, checked: v.checked, planFor: v.planFor, seed: v.seed } : null);
      setSaved(cur => ({
        ...cur, seed, choices: g.choices, checked: [], setupDone: true,
        planFor: { people: v.settings.people, slots: v.settings.slots },
      }));
      setPlan(g.plan);
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, []);

  const undoPlan = useCallback(() => {
    if (!undo) return;
    setSaved(v => ({ ...v, ...undo, settings: undo.planFor ? { ...v.settings, people: undo.planFor.people, slots: undo.planFor.slots } : v.settings }));
    setUndo(null);
  }, [undo]);
  const clearUndo = useCallback(() => setUndo(null), []);

  const swap = useCallback(async (day: number, slot: Slot, recipeId: string) => {
    const v = savedRef.current;
    if (!v.choices) return;
    setUndo(null);
    try {
      const choices = await api.swap(v.choices, day, slot, recipeId);
      setSaved(cur => ({ ...cur, choices }));
    } catch (e) { fail(e); }
  }, []);

  const move = useCallback(async (from: number, to: number) => {
    const v = savedRef.current;
    if (!v.choices || from === to) return;
    try {
      const r = await api.move(v.settings, v.choices, from, to);
      // moving a dinner onto a night off is part of the plan, not a change to the week
      const planFor = v.planFor ? { ...v.planFor, slots: { ...v.planFor.slots, dinner: swapFlags(v.planFor.slots.dinner, from, to) } } : null;
      setSaved(cur => ({ ...cur, choices: r.choices, settings: r.settings, planFor }));
    } catch (e) { fail(e); }
  }, []);

  const toggle = (list: 'have' | 'checked', key: string) =>
    setSaved(v => ({ ...v, [list]: v[list].includes(key) ? v[list].filter(k => k !== key) : [...v[list], key] }));

  const reset = useCallback(() => setSaved(initial()), []);

  return {
    loaded: storageLoaded && dataReady, error, retry: connect, busy,
    saved, plan: dataReady && saved.choices ? plan : null, have, setSettings, makePlan, swap, move, reset, undo: !!undo, undoPlan, clearUndo,
    stale: dataReady ? staleReason(saved) : null,
    toggleHave: (k: string) => toggle('have', k),
    toggleChecked: (k: string) => toggle('checked', k),
  };
}
export type App = ReturnType<typeof useApp>;
