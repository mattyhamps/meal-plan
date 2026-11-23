// Display helpers: turning amounts into kitchen-friendly text. No planning logic here.
import type { Choices, Data, Ing, Meal, Price, Settings } from './types';

export const totalMinutes = (m: Meal) => (m.prep ?? 0) + (m.cook ?? 0);

/** Pantry basics (spices, oil, soy sauce...): the server marks these on each price. */
export const isBasic = (_key: string, p?: Price) => !!p?.basic;

const indexCache = new WeakMap<Meal[], Record<string, Meal>>();
/** Recipes by id. Cached per loaded recipe list. */
export function mealIndex(data: Data) {
  let ix = indexCache.get(data.meals);
  if (!ix) { ix = Object.fromEntries(data.meals.map(m => [m.id, m])); indexCache.set(data.meals, ix); }
  return ix;
}

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
