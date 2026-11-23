import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applySwap, Choices, moveDinner, defaultSettings, derive, emptyChoices, generate, Plan, Settings, Slot,
} from './planner';
import { data, suggestedBudget } from './data';

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

export function useApp() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [loaded, setLoaded] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setSaved({ ...initial(), ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (first.current) { first.current = false; return; }
    AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved, loaded]);

  const have = useMemo(() => new Set(saved.have), [saved.have]);
  const plan: Plan | null = useMemo(
    () => (saved.choices ? derive(saved.choices, saved.settings, data, have) : null),
    [saved.choices, saved.settings, have],
  );

  // the plan before the last "new plan", so it can be undone (not saved between visits)
  const [undo, setUndo] = useState<Pick<Saved, 'choices' | 'checked' | 'planFor' | 'seed'> | null>(null);
  const setSettings = useCallback((s: Settings) => setSaved(v => ({ ...v, settings: s })), []);

  const makePlan = useCallback(() => {
    setUndo(saved.choices ? { choices: saved.choices, checked: saved.checked, planFor: saved.planFor, seed: saved.seed } : null);
    setSaved(v => {
      const seed = (v.seed * 7919 + 17) % 1000003;
      const g = generate(v.settings, data, new Set(v.have), seed);
      return {
        ...v, seed, choices: g.choices, checked: [], setupDone: true,
        planFor: { people: v.settings.people, slots: v.settings.slots },
      };
    });
  }, [saved.choices, saved.checked, saved.planFor, saved.seed]);

  const undoPlan = useCallback(() => {
    if (!undo) return;
    setSaved(v => ({ ...v, ...undo, settings: undo.planFor ? { ...v.settings, people: undo.planFor.people, slots: undo.planFor.slots } : v.settings }));
    setUndo(null);
  }, [undo]);
  const clearUndo = useCallback(() => setUndo(null), []);

  const swap = useCallback((day: number, slot: Slot, recipeId: string) => {
    setUndo(null);
    setSaved(v => (v.choices ? { ...v, choices: applySwap(v.choices, day, slot, recipeId) } : v));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setSaved(v => {
      if (!v.choices || from === to) return v;
      const r = moveDinner(v.choices, v.settings, from, to);
      // moving a dinner onto a night off is part of the plan, not a change to the week
      const planFor = v.planFor && moveDinner(v.choices, { ...v.settings, slots: v.planFor.slots }, from, to).settings.slots;
      return { ...v, choices: r.choices, settings: r.settings, planFor: v.planFor && planFor ? { ...v.planFor, slots: planFor } : v.planFor };
    });
  }, []);

  const toggle = (list: 'have' | 'checked', key: string) =>
    setSaved(v => ({ ...v, [list]: v[list].includes(key) ? v[list].filter(k => k !== key) : [...v[list], key] }));

  const reset = useCallback(() => setSaved(initial()), []);

  return {
    loaded, saved, plan, have, setSettings, makePlan, swap, move, reset, undo: !!undo, undoPlan, clearUndo,
    stale: staleReason(saved),
    toggleHave: (k: string) => toggle('have', k),
    toggleChecked: (k: string) => toggle('checked', k),
    choicesOrEmpty: saved.choices ?? emptyChoices(),
  };
}
export type App = ReturnType<typeof useApp>;
