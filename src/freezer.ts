// How long an opened ingredient keeps in the fridge (or on the counter, for bread),
// and how to freeze what's left. Only ingredients that freeze reasonably well are listed;
// anything else (lettuce, sour cream, avocado, eggs, hard cheese, root veg) is left alone.
export type FreezeInfo = { days: number; how: string };

const MEAT: FreezeInfo = { days: 2, how: 'Wrap tightly or bag it flat; keeps 3 months. Thaw overnight in the fridge.' };
const SEAFOOD: FreezeInfo = { days: 1, how: 'Bag it airtight; keeps 3 months. Thaw overnight in the fridge.' };
const BREAD: FreezeInfo = { days: 7, how: 'Bag it; keeps 3 months. Toast or warm straight from frozen.' };
const TORTILLA: FreezeInfo = { days: 7, how: 'Bag with parchment between them; keeps 3 months.' };
const SHRED: FreezeInfo = { days: 7, how: 'Bag it; keeps 3 months. Best melted, not raw.' };
const CAN: FreezeInfo = { days: 5, how: 'Freeze in a container or ice-cube tray; keeps 3 months.' };

const TABLE: Record<string, FreezeInfo> = {
  'ground beef': MEAT, 'ground turkey': MEAT, 'ground pork': MEAT, 'italian sausage': MEAT, 'chorizo': MEAT,
  'breakfast sausage': MEAT, 'chicken breast': MEAT, 'chicken thighs boneless': MEAT, 'chicken thighs bone-in': MEAT,
  'chicken cutlets': MEAT, 'chicken wings': MEAT, 'pork chops': MEAT, 'pork butt': MEAT, 'steak': MEAT, 'ribeye': MEAT,
  'salmon': SEAFOOD, 'shrimp': SEAFOOD,
  'rotisserie chicken': { days: 3, how: 'Pull the meat off and bag it; keeps 3 months.' },
  'deli turkey': { days: 4, how: 'Bag slices flat; keeps 2 months. Best in hot sandwiches after.' },
  'prosciutto': { days: 5, how: 'Bag slices flat with parchment between; keeps 2 months.' },
  'tofu': { days: 3, how: 'Freeze in water in a container; texture gets chewier, great for stir-fries.' },
  'heavy cream': { days: 7, how: 'Freeze in an ice-cube tray; use in cooking, not whipping.' },
  'half and half': { days: 7, how: 'Freeze in an ice-cube tray for cooking.' },
  'ricotta': { days: 5, how: 'Freeze in a container; use in baked dishes after.' },
  'cheddar shredded': SHRED, 'mexican cheese': SHRED, 'mozzarella shredded': SHRED, 'monterey jack': SHRED,
  'sandwich bread': BREAD, 'sourdough bread': BREAD, 'brioche buns': BREAD, 'potato buns': BREAD, 'ciabatta': BREAD,
  'baguette': { days: 2, how: 'Slice and bag it; keeps 3 months. Warm in the oven from frozen.' },
  'english muffins': BREAD, 'pitas': BREAD,
  'flour tortillas': TORTILLA, 'large flour tortillas': TORTILLA, 'corn tortillas': TORTILLA,
  'ravioli': { days: 3, how: 'Freeze on a tray, then bag; cook straight from frozen.' },
  'chicken broth': CAN, 'vegetable broth': CAN, 'coconut milk': CAN, 'tomato paste': { days: 5, how: 'Freeze in tablespoon blobs on parchment, then bag.' },
  'chipotle in adobo': { days: 7, how: 'Freeze each pepper with a little sauce in an ice-cube tray.' },
  'diced tomatoes': CAN, 'fire roasted tomatoes': CAN, 'crushed tomatoes': CAN, 'tomato sauce': CAN,
  'marinara': CAN, 'pizza sauce': CAN, 'black beans': CAN, 'chickpeas': CAN,
  'spinach': { days: 4, how: 'Bag it; use frozen in cooking or smoothies, not salads.' },
  'banana': { days: 7, how: 'Peel, slice and bag; great for smoothies or banana bread.' },
  'bell pepper': { days: 5, how: 'Dice and bag; use in cooked dishes.' },
  'red bell pepper': { days: 5, how: 'Dice and bag; use in cooked dishes.' },
  'ginger': { days: 14, how: 'Freeze whole; grate it straight from frozen.' },
};

export const freezeInfo = (key: string): FreezeInfo | undefined => TABLE[key];
