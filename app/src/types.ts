// Shapes of the data the planner server sends, and the day/slot names. The planning itself lives in server/.

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type Slot = 'breakfast' | 'lunch' | 'dinner';
export const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner'];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type Ing = { item: string; qty: number; unit: string; key?: string; pkg?: number; cost?: number };
export type Meal = {
  id: string; name: string; type: MealType; servings: number;
  prep: number | null; cook: number | null; inactive: number | null; calories: number | null;
  tags: string[]; easy: boolean; source: string; anchor: string | null; protein: string | null;
  freezer?: { rating: string; months?: number; tip?: string } | null;
  ingredients: Ing[]; pantry: Ing[]; steps: string[]; blends: string[]; note?: string | null;
};
export type Price = { size: number; unit: string; price: number; name: string; aisle: string; pantry: boolean; basic: boolean };
export type Data = { meals: Meal[]; prices: Record<string, Price> };

export type Settings = {
  people: number; // 1-4
  budget: number; // weekly dollars
  easy: boolean;
  slots: Record<Slot, boolean[]>; // 7 booleans per slot, Mon..Sun
};
export type Choices = Record<Slot, (string | null)[]>; // recipe id per day (null = not planned)

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

export type Generated = { choices: Choices; plan: Plan };
export type SwapOption = { recipeId: string; total: number; delta: number };
