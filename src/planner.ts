// Pure planning logic: no React, no storage. Everything here is deterministic given a seed.
import { freezeInfo } from './freezer';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type Slot = 'breakfast' | 'lunch' | 'dinner';
export const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner'];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_TYPE: Record<Slot, MealType> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export type Ing = { item: string; qty: number; unit: string; key?: string; pkg?: number; cost?: number };
export type Meal = {
  id: string; name: string; type: MealType; servings: number;
  prep: number | null; cook: number | null; inactive: number | null; calories: number | null;
  tags: string[]; easy: boolean; source: string; anchor: string | null; protein: string | null;
  freezer?: { rating: string; months?: number; tip?: string } | null;
  ingredients: Ing[]; pantry: Ing[]; steps: string[]; blends: string[]; note?: string | null;
};
export type Price = { size: number; unit: string; price: number; name: string; aisle: string; pantry: boolean };
export type Data = { meals: Meal[]; prices: Record<string, Price> };

export type Settings = {
  people: number; // 1-4
  budget: number; // weekly dollars
  easy: boolean;
  slots: Record<Slot, boolean[]>; // 7 booleans per slot, Mon..Sun
};
export type Choices = Record<Slot, (string | null)[]>; // recipe id per day (null = not planned)

// Things almost every kitchen already has. They are listed but not counted toward the total
// unless the person says they need to buy them.
const BASIC_AISLES = new Set(['Spices', 'Baking & Oils']);
const BASIC_KEYS = new Set([
  'soy sauce', 'rice vinegar', 'balsamic vinegar', 'red wine vinegar', 'white wine vinegar', 'cider vinegar',
  'worcestershire', 'hot sauce', 'sriracha', 'mayonnaise', 'dijon mustard', 'yellow mustard', 'honey',
  'maple syrup', 'sesame oil', 'bouillon paste', 'beef bouillon paste', 'vegetable bouillon paste',
]);
export const isBasic = (key: string, p?: Price) => BASIC_KEYS.has(key) || (!!p && BASIC_AISLES.has(p.aisle));

const MAX_EXTRA = 2; // extra dinner portions per recipe
const LEFTOVER_DAYS = 3; // leftovers eaten within this many days
const MAX_SAME_PROTEIN = 2;
const PKG_TOLERANCE = 0.03; // 16.4 oz of a 16 oz pack still counts as one pack

// ---------- random ----------
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function shuffle<T>(a: T[], r: () => number): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// ---------- scaling ----------
/** How many servings to cook so the anchor protein uses whole packages. */
export function dinnerServings(meal: Meal, people: number, prices: Record<string, Price>): number {
  if (!meal.anchor) return people;
  const ing = meal.ingredients.find(i => i.key === meal.anchor);
  const p = prices[meal.anchor];
  if (!ing?.pkg || !p) return people;
  const perServing = ing.pkg / meal.servings;
  const packs = Math.max(1, Math.ceil((people * perServing) / p.size - PKG_TOLERANCE));
  const fits = Math.floor((packs * p.size) / perServing + 1e-6);
  return Math.max(people, Math.min(people + MAX_EXTRA, fits));
}

export const totalMinutes = (m: Meal) => (m.prep ?? 0) + (m.cook ?? 0);

// ---------- plan derivation ----------
export type LeftoverUse = { fromDay: number; recipeId: string; portions: number };
export type Cooked = { day: number; slot: Slot; recipeId: string; servings: number };
export type DayPlan = {
  breakfast?: { recipeId: string; servings: number };
  lunch?: { leftovers: LeftoverUse[]; staple?: { recipeId: string; servings: number } };
  dinner?: { recipeId: string; servings: number; extra: number; extraTo: number[]; unused: number };
};
export type GroceryItem = {
  key: string; name: string; aisle: string; basic: boolean;
  needed: number; unit: string; packages: number; size: number; price: number; cost: number;
  usedBy: string[];
};
export type FreezeNote = {
  day: number; slot: Slot; key: string; amount: number; unit: string;
  nextDay: number | null; // set when some of it is needed again later this week
  how: string;
};
export type CookAhead = {
  kind: 'chicken' | 'protein' | 'rice'; // replaces a rotisserie chicken, adds leftover protein, or day-old rice
  day: number; slot: Slot; fromRecipe: string; // the earlier meal that cooks extra
  forDay: number; forSlot: Slot; forRecipe: string; // the meal that uses it
  rawKey: string; rawOz: number; cookedOz: number;
  freeze: boolean; // longer than cooked chicken keeps in the fridge
};
export type Plan = {
  days: DayPlan[]; cooked: Cooked[]; groceries: GroceryItem[]; freezeNotes: FreezeNote[]; cookAhead: CookAhead[];
  subs: Record<string, string>; // recipe ingredient key -> what we're buying instead this week
  total: number; // packages you need to buy (excludes basics and things you have)
  usedValue: number; // value of what actually gets eaten
  unusedPortions: number;
};

export function derive(choices: Choices, s: Settings, data: Data, have: Set<string> = new Set()): Plan {
  const byId = mealIndex(data);
  const n = s.people;
  const days: DayPlan[] = DAYS.map(() => ({}));
  const cooked: Cooked[] = [];
  const lunchNeed = DAYS.map((_, d) => (s.slots.lunch[d] ? n : 0));
  const lunchLeft: LeftoverUse[][] = DAYS.map(() => []);

  for (let d = 0; d < 7; d++) {
    const id = s.slots.dinner[d] ? choices.dinner[d] : null;
    const m = id ? byId[id] : undefined;
    if (!m) continue;
    const servings = dinnerServings(m, n, data.prices);
    let extra = servings - n;
    const extraTo: number[] = [];
    for (let d2 = d + 1; d2 <= Math.min(6, d + LEFTOVER_DAYS) && extra > 0; d2++) {
      const take = Math.min(extra, lunchNeed[d2]);
      if (take > 0) {
        lunchNeed[d2] -= take; extra -= take;
        lunchLeft[d2].push({ fromDay: d, recipeId: m.id, portions: take });
        extraTo.push(d2);
      }
    }
    days[d].dinner = { recipeId: m.id, servings, extra: servings - n, extraTo, unused: extra };
    cooked.push({ day: d, slot: 'dinner', recipeId: m.id, servings });
  }
  for (let d = 0; d < 7; d++) {
    const b = s.slots.breakfast[d] ? choices.breakfast[d] : null;
    if (b && byId[b]) {
      days[d].breakfast = { recipeId: b, servings: n };
      cooked.push({ day: d, slot: 'breakfast', recipeId: b, servings: n });
    }
    if (s.slots.lunch[d]) {
      const l = choices.lunch[d];
      const lunch: DayPlan['lunch'] = { leftovers: lunchLeft[d] };
      if (lunchNeed[d] > 0 && l && byId[l]) {
        lunch.staple = { recipeId: l, servings: lunchNeed[d] };
        cooked.push({ day: d, slot: 'lunch', recipeId: l, servings: lunchNeed[d] });
      }
      days[d].lunch = lunch;
    }
  }

  // groceries: add up every ingredient, then round to whole packages
  const need = new Map<string, { amt: number; usedBy: Set<string> }>();
  const uses = new Map<string, { day: number; slot: Slot; amt: number }[]>();
  let usedValue = 0;
  const cookAhead = planCookAhead(cooked, byId, data.prices);
  const add = (key: string, amt: number, who: string, day: number, slot: Slot) => {
    const p = data.prices[key];
    if (!p) return;
    const e = need.get(key) ?? { amt: 0, usedBy: new Set<string>() };
    e.amt += amt;
    e.usedBy.add(who);
    need.set(key, e);
    const u = uses.get(key) ?? [];
    u.push({ day, slot, amt });
    uses.set(key, u);
    usedValue += (amt * p.price) / p.size;
  };
  for (const c of cooked) {
    const m = byId[c.recipeId];
    const f = c.servings / m.servings;
    const ahead = cookAhead.filter(a => a.forDay === c.day && a.forSlot === c.slot);
    for (const i of [...m.ingredients, ...m.pantry]) {
      if (i.cost) usedValue += i.cost * f; // homemade blends
      if (!i.key || i.pkg == null || i.key.startsWith('blend:')) continue;
      if (i.key === COOKED_CHICKEN && ahead.some(a => a.kind === 'chicken')) continue; // comes from the earlier meal instead
      if (RICE.includes(i.key) && ahead.some(a => a.kind === 'rice')) continue; // cooked with an earlier meal
      add(i.key, i.pkg * f, m.name, c.day, c.slot);
    }
  }
  // extra raw chicken is bought and cooked with the earlier meal
  for (const a of cookAhead) {
    const unit = data.prices[a.rawKey]?.unit;
    add(a.rawKey, unit === 'lb' ? a.rawOz / 16 : a.rawOz, byId[a.forRecipe].name, a.day, a.slot);
  }
  const subs = mergeChicken(need, uses, data.prices);
  const groceries: GroceryItem[] = [];
  let total = 0;
  for (const [key, e] of need) {
    if (e.amt <= 0) continue;
    const p = data.prices[key];
    const packages = Math.max(1, Math.ceil(e.amt / p.size - PKG_TOLERANCE));
    const basic = isBasic(key, p);
    const cost = packages * p.price;
    if (!basic && !have.has(key)) total += cost;
    if (basic && have.has('!' + key)) total += cost; // "!key" = basic the person marked as needed
    groceries.push({ key, name: p.name, aisle: p.aisle, basic, needed: e.amt, unit: p.unit, packages,
      size: p.size, price: p.price, cost, usedBy: [...e.usedBy] });
  }
  groceries.sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name));
  const freezeNotes = groceries.flatMap(g => freezePlan(g, uses.get(g.key) ?? []));
  const unusedPortions = days.reduce((t, d) => t + (d.dinner?.unused ?? 0), 0);
  return { days, cooked, groceries, freezeNotes, cookAhead, subs, total: round2(total), usedValue: round2(usedValue), unusedPortions };
}

// ---------- one kind of chicken per week ----------
// Breasts, boneless thighs and cutlets (thin-sliced breasts) swap freely in these recipes,
// so buy whichever pack covers the week's total for less.
const CHICKEN_GROUP = ['chicken breast', 'chicken thighs boneless', 'chicken cutlets'];
const CHICKEN_BUY = ['chicken breast', 'chicken thighs boneless'];

function mergeChicken(
  need: Map<string, { amt: number; usedBy: Set<string> }>,
  uses: Map<string, { day: number; slot: Slot; amt: number }[]>,
  prices: Record<string, Price>,
): Record<string, string> {
  const present = CHICKEN_GROUP.filter(k => need.has(k));
  if (!present.length) return {};
  const lb = (k: string) => (prices[k].unit === 'lb' ? 1 : 1 / 16);
  const totalLb = present.reduce((t, k) => t + need.get(k)!.amt * lb(k), 0);
  const cost = (k: string) => Math.max(1, Math.ceil(totalLb / (prices[k].size * lb(k)) - PKG_TOLERANCE)) * prices[k].price;
  const buy = CHICKEN_BUY.filter(k => prices[k]).sort((a, b) => cost(a) - cost(b))[0];
  const merged = { amt: 0, usedBy: new Set<string>() };
  const mergedUses: { day: number; slot: Slot; amt: number }[] = [];
  const subs: Record<string, string> = {};
  for (const k of present) {
    const e = need.get(k)!;
    const f = lb(k) / lb(buy);
    merged.amt += e.amt * f;
    e.usedBy.forEach(n => merged.usedBy.add(n));
    for (const u of uses.get(k) ?? []) mergedUses.push({ ...u, amt: u.amt * f });
    need.delete(k); uses.delete(k);
    if (k !== buy) subs[k] = buy;
  }
  need.set(buy, merged);
  uses.set(buy, mergedUses);
  return subs;
}

// ---------- cook once, use twice ----------
const COOKED_CHICKEN = 'rotisserie chicken';
const COOKED_OZ_PER_CHICKEN = 24; // meat from one rotisserie chicken, matching how recipes were priced
const RAW_TO_COOKED = 0.75; // boneless chicken loses about a quarter of its weight cooking
const RAW_CHICKEN = ['chicken breast', 'chicken thighs boneless', 'chicken cutlets'];
const COOKED_FRIDGE_DAYS = 3;
// recipes that take whatever protein is left from earlier: cooked oz for the recipe's base servings
// cooked oz for the base servings, and how many days back the protein can come from
const LEFTOVER_PROTEIN: Record<string, { oz: number; maxDays: number }> = {
  'fried-rice': { oz: 8, maxDays: 7 },
  'upgraded-ramen': { oz: 3, maxDays: 2 }, // a quick lunch: only from a recent dinner, nothing frozen
};
// recipes that want rice cooked a day or more ahead
const DAY_OLD_RICE = new Set(['fried-rice']);
const RICE = ['jasmine rice', 'white rice', 'basmati rice'];
const PROTEIN_OK = new Set([...RAW_CHICKEN, 'ground beef', 'ground pork', 'ground turkey', 'pork chops', 'pork butt',
  'steak', 'ribeye', 'shrimp', 'tofu']);

/**
 * For each meal that calls for cooked (rotisserie) chicken, look for the nearest earlier meal
 * this week that already cooks raw boneless chicken. Cook extra there instead of buying a
 * rotisserie chicken.
 */
function planCookAhead(cooked: Cooked[], byId: Record<string, Meal>, prices: Record<string, Price>): CookAhead[] {
  const order = (c: { day: number; slot: Slot }) => c.day * 3 + SLOTS.indexOf(c.slot);
  const sorted = cooked.slice().sort((a, b) => order(a) - order(b));
  const out: CookAhead[] = [];
  for (const c of sorted) {
    const m = byId[c.recipeId];
    const f = c.servings / m.servings;
    const earlier = sorted.filter(o => order(o) < order(c)).reverse();
    const want = [...m.ingredients, ...m.pantry].filter(i => i.key === COOKED_CHICKEN).reduce((t, i) => t + (i.pkg ?? 0) * f, 0);
    if (want > 0) {
      const src = earlier.find(o => byId[o.recipeId].ingredients.some(i => i.key && RAW_CHICKEN.includes(i.key)));
      if (!src) continue;
      const rawKey = byId[src.recipeId].ingredients.find(i => i.key && RAW_CHICKEN.includes(i.key))!.key!;
      const cookedOz = want * COOKED_OZ_PER_CHICKEN;
      out.push({
        kind: 'chicken', day: src.day, slot: src.slot, fromRecipe: src.recipeId,
        forDay: c.day, forSlot: c.slot, forRecipe: c.recipeId,
        rawKey, rawOz: cookedOz / RAW_TO_COOKED, cookedOz, freeze: c.day - src.day > COOKED_FRIDGE_DAYS,
      });
    } else if (LEFTOVER_PROTEIN[m.id]) {
      const rule = LEFTOVER_PROTEIN[m.id];
      const src = earlier.find(o => {
        const a = byId[o.recipeId].anchor;
        return o.slot === 'dinner' && c.day - o.day <= rule.maxDays && !!a && PROTEIN_OK.has(a) && !!prices[a];
      });
      if (src) {
        const rawKey = byId[src.recipeId].anchor!;
        const cookedOz = rule.oz * f;
        const ratio = rawKey === 'tofu' ? 1 : RAW_TO_COOKED; // tofu barely shrinks
        out.push({
          kind: 'protein', day: src.day, slot: src.slot, fromRecipe: src.recipeId,
          forDay: c.day, forSlot: c.slot, forRecipe: c.recipeId,
          rawKey, rawOz: cookedOz / ratio, cookedOz, freeze: c.day - src.day > COOKED_FRIDGE_DAYS,
        });
      }
    }
    if (DAY_OLD_RICE.has(m.id)) {
      const riceIng = m.ingredients.find(i => i.key && RICE.includes(i.key));
      // an earlier day's meal that already cooks rice
      const src = earlier.find(o => o.day < c.day && byId[o.recipeId].ingredients.some(i => i.key && RICE.includes(i.key)));
      if (riceIng?.pkg && src) {
        const rawKey = byId[src.recipeId].ingredients.find(i => i.key && RICE.includes(i.key))!.key!;
        const dryOz = riceIng.pkg * f; // rice prices are per oz of dry rice
        out.push({
          kind: 'rice', day: src.day, slot: src.slot, fromRecipe: src.recipeId,
          forDay: c.day, forSlot: c.slot, forRecipe: c.recipeId,
          rawKey, rawOz: dryOz, cookedOz: dryOz * 3, freeze: c.day - src.day > COOKED_FRIDGE_DAYS,
        });
      }
    }
  }
  return out;
}

/**
 * Walk through the week's uses of one ingredient. Once it's opened, it keeps for `days`.
 * If the next use is further out than that, freeze what's left after this meal; if there is
 * no next use and a meaningful amount is left, freeze the extra.
 */
function freezePlan(g: GroceryItem, list: { day: number; slot: Slot; amt: number }[]): FreezeNote[] {
  const info = freezeInfo(g.key);
  if (!info || g.basic || !list.length) return [];
  const order = (u: { day: number; slot: Slot }) => u.day * 3 + SLOTS.indexOf(u.slot);
  const sorted = list.slice().sort((a, b) => order(a) - order(b));
  // merge uses of the same meal (an ingredient can appear twice in one recipe)
  const merged: typeof sorted = [];
  for (const u of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.day === u.day && last.slot === u.slot) last.amt += u.amt; else merged.push({ ...u });
  }
  const worthIt = (amt: number) => amt >= g.size * 0.15 && (amt * g.price) / g.size >= 0.5;
  const notes: FreezeNote[] = [];
  let remaining = g.packages * g.size;
  let opened = merged[0].day;
  for (let k = 0; k < merged.length; k++) {
    const u = merged[k];
    remaining -= u.amt;
    if (remaining <= 0) break;
    const next = merged[k + 1];
    if (next && next.day - opened <= info.days) continue;
    if (!next && !worthIt(remaining)) continue;
    if (next && remaining < g.size * 0.03) continue;
    notes.push({ day: u.day, slot: u.slot, key: g.key, amount: remaining, unit: g.unit, nextDay: next ? next.day : null, how: info.how });
    if (next) opened = next.day; // thawed for that meal, so the clock restarts
  }
  return notes;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const indexCache = new WeakMap<Data, Record<string, Meal>>();
export function mealIndex(data: Data) {
  let ix = indexCache.get(data);
  if (!ix) { ix = Object.fromEntries(data.meals.map(m => [m.id, m])); indexCache.set(data, ix); }
  return ix;
}

// ---------- pools ----------
export function pool(slot: Slot, s: Settings, data: Data): Meal[] {
  // batch recipes (energy balls, banana bread, 8 burritos) don't fit a one-day slot yet
  let p = data.meals.filter(m => m.type === SLOT_TYPE[slot] && m.servings <= 4);
  if (s.easy) {
    const easy = p.filter(m => m.easy);
    const needed = s.slots[slot].filter(Boolean).length;
    if (easy.length >= Math.min(needed, 3)) p = easy;
  }
  return p;
}

// ---------- generation ----------
function randomChoices(s: Settings, data: Data, r: () => number): Choices {
  const out: Choices = { breakfast: Array(7).fill(null), lunch: Array(7).fill(null), dinner: Array(7).fill(null) };
  // dinners: all different, limited repeats of the same protein
  const dinners = shuffle(pool('dinner', s, data), r);
  const proteinCount: Record<string, number> = {};
  let k = 0;
  for (let d = 0; d < 7; d++) {
    if (!s.slots.dinner[d]) continue;
    while (k < dinners.length) {
      const m = dinners[k++];
      const pr = m.protein ?? m.id;
      if ((proteinCount[pr] ?? 0) >= MAX_SAME_PROTEIN) continue;
      proteinCount[pr] = (proteinCount[pr] ?? 0) + 1;
      out.dinner[d] = m.id;
      break;
    }
  }
  // breakfasts and lunches: two staples that alternate, like a real week
  for (const slot of ['breakfast', 'lunch'] as Slot[]) {
    const p = shuffle(pool(slot, s, data), r);
    if (!p.length) continue;
    const pick = p.slice(0, Math.min(2, p.length));
    let i = 0;
    for (let d = 0; d < 7; d++) if (s.slots[slot][d]) out[slot][d] = pick[i++ % pick.length].id;
  }
  return out;
}

export type Generated = { choices: Choices; plan: Plan };

/** Lower is better: being over budget hurts most, then food bought but not eaten. */
function objective(p: Plan, budget: number) {
  return Math.max(0, p.total - budget) * 4 + wasteScore(p);
}

function dinnerAllowed(choices: Choices, day: number, m: Meal, s: Settings, byId: Record<string, Meal>) {
  let same = 0;
  for (let d = 0; d < 7; d++) {
    if (d === day || !s.slots.dinner[d] || !choices.dinner[d]) continue;
    const o = byId[choices.dinner[d]!];
    if (o.id === m.id) return false;
    if ((o.protein ?? o.id) === (m.protein ?? m.id)) same++;
  }
  return same < MAX_SAME_PROTEIN;
}

/** Improve a week one meal at a time until no single change helps. */
function improve(start: Choices, s: Settings, data: Data, have: Set<string>, r: () => number, maxPasses = 3): Generated {
  const byId = mealIndex(data);
  let choices = start;
  let plan = derive(choices, s, data, have);
  let score = objective(plan, s.budget);
  const pools = { breakfast: pool('breakfast', s, data), lunch: pool('lunch', s, data), dinner: pool('dinner', s, data) };
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    const moves: [Slot, number][] = [];
    for (const slot of SLOTS) for (let d = 0; d < 7; d++) if (s.slots[slot][d] && choices[slot][d]) moves.push([slot, d]);
    for (const [slot, d] of shuffle(moves, r)) {
      // staples change as a group, so only try the first day of each group
      if (slot !== 'dinner' && choices[slot].indexOf(choices[slot][d]) !== d) continue;
      for (const m of shuffle(pools[slot], r)) {
        if (m.id === choices[slot][d]) continue;
        if (slot === 'dinner' && !dinnerAllowed(choices, d, m, s, byId)) continue;
        if (slot !== 'dinner' && choices[slot].includes(m.id)) continue;
        const next = applySwap(choices, d, slot, m.id);
        const p = derive(next, s, data, have);
        const sc = objective(p, s.budget);
        if (sc < score - 0.01) { choices = next; plan = p; score = sc; improved = true; }
      }
    }
    if (!improved) break;
  }
  return { choices, plan };
}

/** Sample weeks, polish the most promising few, and pick a varied one that fits the budget. */
export function generate(s: Settings, data: Data, have: Set<string>, seed: number, samples = 150, polish = 4): Generated {
  const r = rng(seed);
  const cands: (Generated & { score: number })[] = [];
  for (let t = 0; t < samples; t++) {
    const choices = randomChoices(s, data, r);
    const plan = derive(choices, s, data, have);
    cands.push({ choices, plan, score: objective(plan, s.budget) });
  }
  cands.sort((a, b) => a.score - b.score);
  // polish a mix of the best and some random ones so results don't all look alike
  const starts = [cands[0], ...shuffle(cands.slice(1, 30), r).slice(0, polish - 1)];
  const done = starts.map(c => improve(c.choices, s, data, have, r));
  const under = done.filter(g => g.plan.total <= s.budget);
  if (under.length) return under[Math.floor(r() * under.length)];
  done.sort((a, b) => a.plan.total - b.plan.total);
  return done[0];
}

/** Money spent on food that doesn't get eaten this week, plus a penalty for orphan portions. */
export function wasteScore(p: Plan) {
  const bought = p.groceries.filter(g => !g.basic).reduce((t, g) => t + g.cost, 0);
  const used = p.groceries.filter(g => !g.basic).reduce((t, g) => t + (g.needed * g.price) / g.size, 0);
  return bought - used + p.unusedPortions * 2;
}

// ---------- swaps ----------
export type SwapOption = { recipeId: string; total: number; delta: number };

export function swapOptions(
  choices: Choices, day: number, slot: Slot, s: Settings, data: Data, have: Set<string>, seed: number, count = 3,
): SwapOption[] {
  const current = choices[slot][day];
  const base = derive(choices, s, data, have).total;
  const byId = mealIndex(data);
  const usedProteins: Record<string, number> = {};
  if (slot === 'dinner') {
    choices.dinner.forEach((id, d) => {
      if (!id || d === day || !s.slots.dinner[d]) return;
      const pr = byId[id]?.protein ?? id;
      usedProteins[pr] = (usedProteins[pr] ?? 0) + 1;
    });
  }
  const opts: SwapOption[] = [];
  for (const m of pool(slot, s, data)) {
    if (m.id === current) continue;
    if (slot === 'dinner' && choices.dinner.some((id, d) => id === m.id && s.slots.dinner[d])) continue;
    if (slot === 'dinner' && (usedProteins[m.protein ?? m.id] ?? 0) >= MAX_SAME_PROTEIN) continue;
    const next: Choices = { ...choices, [slot]: choices[slot].slice() };
    next[slot][day] = m.id;
    const total = derive(next, s, data, have).total;
    opts.push({ recipeId: m.id, total, delta: round2(total - base) });
  }
  // keep options that stay near the budget, then pick a varied few
  const limit = Math.max(s.budget, base) + 3;
  const ok = opts.filter(o => o.total <= limit);
  const r = rng(seed);
  const picked = shuffle(ok, r).slice(0, count);
  if (picked.length < count) {
    const rest = opts.filter(o => !picked.includes(o)).sort((a, b) => a.total - b.total);
    picked.push(...rest.slice(0, count - picked.length));
  }
  return picked.sort((a, b) => a.delta - b.delta);
}

export function applySwap(choices: Choices, day: number, slot: Slot, recipeId: string): Choices {
  const next: Choices = { ...choices, [slot]: choices[slot].slice() };
  if (slot === 'dinner') next.dinner[day] = recipeId;
  else {
    // swapping a staple swaps every day that used the same staple, since you buy for all of them
    const old = choices[slot][day];
    next[slot] = choices[slot].map((id, d) => (d === day || (old && id === old) ? recipeId : id));
  }
  return next;
}

/** Trade two days' dinners. A day with no dinner planned trades its night off too. */
export function moveDinner(choices: Choices, s: Settings, from: number, to: number): { choices: Choices; settings: Settings } {
  const dinner = choices.dinner.slice();
  [dinner[from], dinner[to]] = [dinner[to], dinner[from]];
  const on = s.slots.dinner.slice();
  [on[from], on[to]] = [on[to], on[from]];
  return { choices: { ...choices, dinner }, settings: { ...s, slots: { ...s.slots, dinner: on } } };
}

// ---------- helpers for display ----------
export function scaledIngredients(m: Meal, servings: number): Ing[] {
  const f = servings / m.servings;
  return [...m.ingredients, ...m.pantry].map(i => ({ ...i, qty: i.qty * f }));
}

export function formatQty(q: number): string {
  if (q <= 0) return '';
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  const fr: [number, string][] = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
  let best = fr[0];
  for (const f of fr) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) best = f;
  const w = best[0] === 1 ? whole + 1 : whole;
  if (Math.abs(frac - best[0]) > 0.07 && q < 10) return (Math.round(q * 10) / 10).toString();
  return (w ? String(w) : '') + best[1] || '0';
}

// typical raw piece sizes, for "about 2 breasts" hints
const PIECE_OZ: Record<string, [number, string, string, number]> = {
  // key: [oz per piece, singular, plural, rounding step]
  'chicken breast': [8, 'breast', 'breasts', 0.5],
  'chicken thighs boneless': [4, 'thigh', 'thighs', 1],
  'chicken cutlets': [4, 'cutlet', 'cutlets', 1],
};
/** " (about 1½ breasts)" for chicken weights, or "" for anything else. */
export function pieceHint(key: string, oz: number): string {
  const p = PIECE_OZ[key];
  if (!p || oz <= 0) return '';
  const n = Math.max(p[3], Math.round(oz / p[0] / p[3]) * p[3]);
  return ` (about ${formatQty(n)} ${n <= 1 ? p[1] : p[2]})`;
}

/** "6 oz ground turkey", "4 slices sandwich bread", "1 can chicken broth"-style text. */
export function amountText(amount: number, unit: string, key: string): string {
  if (unit === 'lb') return amount < 1 ? `${Math.max(1, Math.round(amount * 16))} oz ${key}` : `${formatQty(amount)} lb ${key}`;
  if (unit === 'oz' || unit === 'fl oz') return `${Math.max(1, Math.round(amount))} ${unit} ${key}`;
  if (unit === 'slice') return `${Math.max(1, Math.round(amount))} slices ${key}`;
  if (unit === 'each') {
    amount = Math.max(0.5, Math.round(amount * 2) / 2);
    const one = amount <= 1.01;
    const name = one ? key.replace(/s$/, '') : key.endsWith('s') ? key : key + 's';
    return `${formatQty(amount)} ${name}`;
  }
  return `${formatQty(amount)} ${unit} ${key}`;
}

const HERBS = new Set(['cilantro', 'parsley', 'dill', 'basil', 'mint', 'thai basil', 'thyme', 'rosemary']);
const UNIT_PLURAL: Record<string, string> = {
  packet: 'packets', clove: 'cloves', slice: 'slices', leaf: 'leaves', stalk: 'stalks', thumb: 'thumbs',
  head: 'heads', inch: 'inches', pinch: 'pinches', spray: 'sprays', stick: 'sticks', cup: 'cups',
};
function pluralWord(w: string) {
  if (/(s|sh|ch|x|z)$/.test(w)) return w.endsWith('s') ? w : w + 'es';
  if (/o$/.test(w) && /(tomato|potato)$/.test(w)) return w + 'es';
  return w + 's';
}
function singularWord(w: string) {
  if (/(tomato|potato)es$/.test(w)) return w.slice(0, -2);
  if (/ss$/.test(w) || !w.endsWith('s')) return w;
  return w.slice(0, -1);
}
/** Make the counted noun agree with the amount: "1½ red onions", "1 egg". */
function nounFor(item: string, qty: number) {
  // split off a trailing note like "(optional)" or ", diced"; keep "bone-in, skin-on chicken thighs" whole
  const cut = item.search(/\(|, (diced|minced|sliced|cubed|chopped|zested|juiced|peeled|halved|quartered|grated|cut)/);
  const head = (cut >= 0 ? item.slice(0, cut) : item).trimEnd();
  const tail = cut >= 0 ? ' ' + item.slice(cut) : '';
  const words = head.split(' ');
  const last = words[words.length - 1];
  if (/zucchini|chicken|lettuce/i.test(last) || / or /.test(head)) return item;
  words[words.length - 1] = qty > 1.01 ? pluralWord(last) : singularWord(last);
  return words.join(' ') + tail;
}

// ---------- kitchen-friendly amounts ----------
// things you'd scoop with a spoon or measuring cup rather than weigh
const SPOONABLE = new Set(['butter', 'sour cream', 'cream cheese', 'mayonnaise', 'greek yogurt', 'yogurt', 'ricotta',
  'peanut butter', 'creme fraiche', 'hummus', 'tomato paste', 'guacamole', 'jelly', 'fig jam', 'red pepper jelly',
  'pico de gallo', 'salsa', 'salsa verde', 'marinara', 'pizza sauce', 'bbq sauce', 'honey', 'maple syrup',
  'ranch dressing', 'caesar dressing', 'italian dressing', 'blue cheese dressing', 'honey dijon dressing']);
const WHOLE_ONLY = new Set(['eggs']);
const roundTo = (x: number, step: number) => Math.max(step, Math.round(x / step) * step);

/**
 * Turn an amount into something you'd measure in a kitchen: whole eggs, tablespoons of butter,
 * cups of broth, halves elsewhere. `buy` rounds counts up (you can't buy a third of an egg).
 */
export function kitchenAmount(key: string | undefined, qty: number, unit: string, mode: 'cook' | 'buy' = 'cook'): { qty: number; unit: string } {
  const k = key ?? '';
  if (qty <= 0) return { qty, unit };
  if (unit === 'each' || unit === 'slice') {
    if (WHOLE_ONLY.has(k) || unit === 'slice') return { qty: mode === 'buy' ? Math.ceil(qty - 0.1) : Math.max(1, Math.round(qty)), unit };
    return { qty: roundTo(qty, 0.5), unit };
  }
  const spoon = SPOONABLE.has(k);
  if ((unit === 'oz' && spoon) || unit === 'fl oz') {
    const tbsp = qty * 2; // ~½ oz (or 1 fl oz = 2 tbsp) per tablespoon
    if (k === 'butter' && tbsp > 16) return { qty: roundTo(qty / 4, 0.5), unit: 'stick' };
    if (k === 'butter' || tbsp <= 4) return { qty: roundTo(tbsp, 0.5), unit: 'tbsp' };
    if (k === 'cream cheese') return { qty: roundTo(qty, 0.5), unit: 'oz' };
    return { qty: roundTo(qty / 8, 0.25), unit: 'cup' };
  }
  if (unit === 'oz') return { qty: qty < 10 ? roundTo(qty, 0.5) : Math.round(qty), unit };
  if (unit === 'lb') return { qty: roundTo(qty, 0.25), unit };
  if (unit === 'tbsp') return qty >= 1 ? { qty: roundTo(qty, 0.5), unit } : { qty: roundTo(qty, 0.25), unit };
  if (unit === 'tsp') {
    // 3 tsp reads better as 1 tbsp, but only when it converts cleanly
    const tb = roundTo(qty / 3, 0.5);
    if (qty >= 3 && Math.abs(tb * 3 - qty) <= 0.26) return { qty: tb, unit: 'tbsp' };
    return { qty: roundTo(qty, qty >= 1 ? 0.5 : 0.25), unit };
  }
  if (unit === 'cup') return { qty: roundTo(qty, 0.25), unit };
  if (UNIT_PLURAL[unit] || unit === 'packet' || unit === 'clove' || unit === 'bunch') return { qty: roundTo(qty, 0.5), unit };
  return { qty, unit };
}

/** Amount and name for a recipe line, in kitchen terms. */
export function ingredientText(raw: Ing): { qty: string; name: string } {
  if (raw.unit === 'oz' && (HERBS.has(raw.key ?? '') || /fresh herbs/i.test(raw.item))) {
    const i = raw;
    const qty = i.qty <= 0.4 ? 'small handful' : i.qty <= 0.8 ? 'handful' : i.qty <= 1.25 ? 'large handful' : 'bunch';
    return { qty, name: i.item };
  }
  const i = { ...raw, ...kitchenAmount(raw.key, raw.qty, raw.unit) };
  const q = formatQty(i.qty);
  if (i.unit === 'each') return { qty: q, name: nounFor(i.item, i.qty) };
  if (i.unit === 'pinch' || i.unit === 'spray') return { qty: i.qty > 1.01 ? `${q} ${UNIT_PLURAL[i.unit]}` : `a ${i.unit}`, name: i.item };
  const unit = i.qty > 1.01 && UNIT_PLURAL[i.unit] ? UNIT_PLURAL[i.unit] : i.unit;
  return { qty: `${q} ${unit}`.trim(), name: i.item };
}

export function emptyChoices(): Choices {
  return { breakfast: Array(7).fill(null), lunch: Array(7).fill(null), dinner: Array(7).fill(null) };
}
export function defaultSettings(people = 2, budget = 120): Settings {
  return {
    people, budget, easy: false,
    slots: { breakfast: Array(7).fill(true), lunch: Array(7).fill(true), dinner: Array(7).fill(true) },
  };
}
