import json, re, collections, sys

# ---------- price list ----------
P = {}
for line in open('prices_havertown.txt'):
    if line.startswith('#') or not line.strip():
        continue
    k, size, unit, price, name = [x.strip() for x in line.split('|')]
    if price == 'NOT FOUND':
        P[k] = None
    else:
        P[k] = dict(size=float(size), unit=unit, price=float(price), name=name)

# ---------- ingredient name -> price key (first matching rule wins) ----------
RULES = [
 (r'ground beef', 'ground beef'), (r'ground turkey', 'ground turkey'), (r'ground pork', 'ground pork'),
 (r'italian (pork )?sausage|bulk italian sausage', 'italian sausage'), (r'chorizo', 'chorizo'),
 (r'breakfast sausage', 'breakfast sausage'),
 (r'chicken cutlets|thin-cut chicken', 'chicken cutlets'),
 (r'bone-in, skin-on chicken thighs', 'chicken thighs bone-in'),
 (r'chicken thighs|diced chicken thighs|boneless chicken thighs', 'chicken thighs boneless'),
 (r'fully cooked chicken|cooked chicken|cooked shredded chicken|rotisserie', 'rotisserie chicken'),
 (r'chicken breast|chopped chicken|chicken thighs or breasts|boneless chicken breasts', 'chicken breast'),
 (r'chicken wings', 'chicken wings'), (r'pork chops', 'pork chops'), (r'pork butt', 'pork butt'),
 (r'ribeye', 'ribeye'), (r'ranch steak|sirloin', 'steak'), (r'salmon', 'salmon'), (r'shrimp', 'shrimp'),
 (r'tuna', 'canned tuna'), (r'turkey breast|deli turkey', 'deli turkey'), (r'prosciutto', 'prosciutto'),
 (r'pepperoni', 'pepperoni'), (r'meatballs', 'frozen meatballs'), (r'tofu', 'tofu'),
 (r'^eggs?$|^egg$', 'eggs'), (r'half-and-half', 'half and half'), (r'heavy cream', 'heavy cream'),
 (r'^milk$', 'milk'), (r'butter$|^butter', 'butter'), (r'sour cream|avocado or sour cream', 'sour cream'),
 (r'cream cheese', 'cream cheese'), (r'greek yogurt', 'greek yogurt'), (r'yogurt', 'yogurt'),
 (r'monterey jack', 'monterey jack'), (r'mexican cheese|shredded mexican', 'mexican cheese'),
 (r'shredded mozzarella', 'mozzarella shredded'), (r'fresh mozzarella', 'fresh mozzarella'),
 (r'parmesan', 'parmesan'), (r'ricotta', 'ricotta'), (r'gouda', 'gouda'),
 (r'american|^cheese$', 'american cheese'), (r'cheddar|shredded cheese', 'cheddar shredded'),
 (r'feta', 'feta'), (r'grilling cheese|halloumi', 'halloumi'), (r'cr[eè]me fra[iî]che', 'creme fraiche'),
 (r'crescent', 'crescent dough'), (r'biscuit', 'biscuit dough'),
 (r'red onion', 'red onion'), (r'shallot', 'shallot'), (r'garlic powder', 'garlic powder'),
 (r'garlic herb butter', 'butter'), (r'^garlic', 'garlic'), (r'ground ginger', 'ground ginger'),
 (r'^ginger', 'ginger'), (r'scallion|green onion', 'scallions'), (r'onion powder', 'onion powder'),
 (r'fried onions', 'crispy fried onions'), (r'onion', 'onion'),
 (r'sweet potato', 'sweet potatoes'), (r'diced potatoes', 'frozen diced potatoes'), (r'potato buns', 'potato buns'),
 (r'potato', 'potatoes'), (r'shredded carrots', 'shredded carrots'), (r'cabbage', 'red cabbage'),
 (r'peas and carrots', 'frozen peas and carrots'), (r'carrot', 'carrots'), (r'celery salt', 'celery salt'),
 (r'celery', 'celery'), (r'red bell pepper|roasted red pepper', None), (r'jalape', 'jalapeno'),
 (r'long green pepper', 'cubanelle pepper'), (r'bell pepper', 'bell pepper'), (r'zucchini', 'zucchini'),
 (r'mini cucumber', 'mini cucumbers'), (r'english cucumber', 'english cucumber'), (r'cucumber', 'cucumber'),
 (r'broccoli florets', 'broccoli florets'), (r'broccoli', 'broccoli'), (r'green beans', 'green beans'),
 (r'brussels', 'brussels sprouts'), (r'cauliflower rice', 'frozen cauliflower rice'), (r'cauliflower', 'cauliflower'),
 (r'eggplant', 'eggplant'), (r'mushroom ravioli', 'ravioli'), (r'mushroom stock', 'vegetable bouillon paste'),
 (r'cream of mushroom', 'cream of mushroom soup'), (r'mushroom', 'mushrooms'),
 (r'spinach', 'spinach'), (r'arugula', 'arugula'), (r'lettuce', 'lettuce'),
 (r'grape tomatoes|cherry tomatoes', 'grape tomatoes'), (r'fire-roasted', 'fire roasted tomatoes'),
 (r'diced tomatoes', 'diced tomatoes'), (r'crushed tomatoes', 'crushed tomatoes'),
 (r'tomato paste', 'tomato paste'), (r'tomato soup', 'tomato soup'), (r'vegan tomato sauce|marinara', 'marinara'),
 (r'tomato sauce', 'tomato sauce'), (r'pizza sauce', 'pizza sauce'), (r'sun-dried', 'sun dried tomatoes'),
 (r'tomato', 'tomato'), (r'guacamole', 'guacamole'), (r'avocado', 'avocado'),
 (r'lemon', 'lemon'), (r'makrut|lime leaves', 'lime leaves'), (r'lime', 'lime'),
 (r'apple or banana', 'banana'), (r'banana', 'banana'), (r'granny smith', 'granny smith'),
 (r'grapes or apple', 'apple'), (r'apple', 'apple'), (r'pear', 'pear'), (r'pineapple', 'pineapple'),
 (r'pomegranate', 'pomegranate'), (r'^fruit', 'berries'), (r'cranberr', 'dried cranberries'),
 (r'thai basil', 'thai basil'), (r'dried basil', 'basil dried'), (r'basil', 'basil'),
 (r'cilantro', 'cilantro'), (r'dried thyme', 'thyme dried'), (r'thyme', 'thyme'),
 (r'rosemary', 'rosemary'), (r'fresh herbs', 'mint'), (r'dill', 'dill'), (r'parsley', 'parsley'),
 (r'dried oregano', 'oregano'), (r'oregano', 'basil'),
 (r'pico', 'pico de gallo'), (r'salsa verde|green salsa', 'salsa verde'), (r'salsa', 'salsa'),
 (r'sushi rice', 'sushi rice'), (r'arborio', 'arborio rice'), (r'basmati', 'basmati rice'),
 (r'cooked jasmine rice', 'jasmine rice'), (r'jasmine', 'jasmine rice'), (r'white rice', 'white rice'),
 (r'quinoa', 'quinoa'), (r'lentil', 'red lentils'), (r'farfalle', 'pasta'), (r'cavatappi', 'cavatappi'),
 (r'rotini', 'rotini'), (r'orzo', 'orzo'), (r'egg noodles', 'egg noodles'), (r'lasagna', 'lasagna noodles'),
 (r'ramen', 'ramen'), (r'quick oats', 'quick oats'), (r'oats', 'old fashioned oats'), (r'cereal', 'cereal'),
 (r'granola', 'granola'), (r'pancake', 'pancake mix'), (r'flour tortillas|large flour', None),
 (r'coconut flour|flour', 'flour'), (r'panko', 'panko'), (r'breadcrumbs', 'breadcrumbs'),
 (r'sandwich bread', 'sandwich bread'), (r'sourdough', 'sourdough bread'), (r'brioche', 'brioche buns'),
 (r'ciabatta', 'ciabatta'), (r'baguette', 'baguette'), (r'english muffin', 'english muffins'),
 (r'pita', 'pitas'), (r'corn tortillas', 'corn tortillas'), (r'tortilla chips', 'tortilla chips'),
 (r'croutons', 'croutons'), (r'waffles', 'belgian waffles'), (r'mixed vegetables', 'frozen mixed vegetables'),
 (r'peas', 'frozen peas'), (r'corn$', 'frozen corn'), (r'black beans', 'black beans'),
 (r'chickpeas', 'chickpeas'), (r'coconut milk', 'coconut milk'), (r'bamboo', 'bamboo shoots'),
 (r'cream of chicken', 'cream of chicken soup'),
 (r'chicken stock concentrate|chicken bouillon', 'bouillon paste'), (r'beef stock concentrate', 'beef bouillon paste'),
 (r'veggie stock concentrate', 'vegetable bouillon paste'),
 (r'chicken broth|chicken or vegetable|vegetable or chicken stock', 'chicken broth'),
 (r'vegetable broth', 'vegetable broth'), (r'sesame oil', 'sesame oil'),
 (r'soy sauce|tamari', 'soy sauce'), (r'rice wine vinegar|rice vinegar', 'rice vinegar'),
 (r'balsamic glaze', 'balsamic glaze'), (r'balsamic', 'balsamic vinegar'),
 (r'red wine vinegar', 'red wine vinegar'), (r'white wine vinegar', 'white wine vinegar'),
 (r'white vinegar', 'cider vinegar'), (r'mirin', 'mirin'), (r'fish sauce', 'fish sauce'),
 (r'sriracha', 'sriracha'), (r'buffalo', 'buffalo sauce'), (r'hot sauce', 'hot sauce'),
 (r'bbq sauce', 'bbq sauce'), (r'worcestershire', 'worcestershire'), (r'sweet soy glaze', 'sweet soy glaze'),
 (r'ponzu', 'ponzu'), (r'chili sauce', 'sweet chili sauce'), (r'curry paste', 'red curry paste'),
 (r'doubanjiang|gochujang', 'gochujang'), (r'mayo', 'mayonnaise'),
 (r'whole-grain mustard', 'whole grain mustard'), (r'dijon mustard', 'dijon mustard'),
 (r'mustard', 'yellow mustard'), (r'honey dijon', 'honey dijon dressing'), (r'ranch', 'ranch dressing'),
 (r'caesar', 'caesar dressing'), (r'italian dressing', 'italian dressing'), (r'blue cheese', 'blue cheese dressing'),
 (r'hummus', 'hummus'), (r'peanut butter', 'peanut butter'), (r'jelly or jam', 'jelly'),
 (r'fig jam', 'fig jam'), (r'pepper jam', 'red pepper jelly'), (r'honey or maple|maple', 'maple syrup'),
 (r'honey', 'honey'), (r'olive', 'olive oil'), (r'coconut oil', 'coconut oil'), (r'cooking spray|oil spray', 'cooking spray'),
 (r'oil', 'vegetable oil'), (r'brown sugar', 'brown sugar'), (r'powdered sugar', 'powdered sugar'),
 (r'sugar', 'sugar'), (r'baking soda', 'baking soda'), (r'baking powder', 'baking powder'),
 (r'yeast', 'yeast'), (r'cornstarch', 'cornstarch'), (r'vanilla|maple extract', 'vanilla'),
 (r'chocolate', 'chocolate chips'), (r'pecans', 'pecans'), (r'peanuts', 'peanuts'), (r'cashews', 'cashews'),
 (r'pistachios', 'pistachios'), (r'almonds', 'sliced almonds'), (r'sesame seeds', 'sesame seeds'),
 (r'nori', 'nori'), (r'smoked paprika', 'smoked paprika'), (r'hot paprika|paprika', 'paprika'),
 (r'chili powder', 'chili powder'), (r'cumin', 'cumin'), (r'coriander', 'coriander'), (r'turmeric', 'turmeric'),
 (r'cinnamon', 'cinnamon'), (r'italian seasoning', 'italian seasoning'),
 (r'red pepper flakes|crushed red pepper|chili flakes', 'red pepper flakes'), (r'cayenne', 'cayenne'),
 (r'poultry seasoning', 'poultry seasoning'), (r'liquid smoke', 'liquid smoke'), (r'white wine', 'white wine'),
 (r'sherry', 'sherry'), (r'black pepper|^pepper$', 'black pepper'), (r'salt', 'salt'),
 (r'dippers', 'tortilla chips'), (r'hershey', 'chocolate chips'), (r'kisses', 'chocolate chips'),
 (r'graham', 'chocolate chips'), (r'toffee', 'chocolate chips'),
]
SPECIAL = {'red bell peppers': 'red bell pepper', 'red bell pepper': 'red bell pepper',
           'roasted red peppers': 'roasted red peppers', 'flour tortillas': 'flour tortillas',
           'large flour tortillas': 'large flour tortillas', 'large flour tortillas ': 'large flour tortillas'}

def key_for(name):
    n = re.sub(r'\s*\(.*?\)', '', name.lower()).strip()
    if n in SPECIAL: return SPECIAL[n]
    for pat, k in RULES:
        if re.search(pat, n):
            if k is None:
                if 'roasted' in n: return 'roasted red peppers'
                if 'red bell' in n: return 'red bell pepper'
                if 'tortilla' in n: return 'large flour tortillas' if 'large' in n else 'flour tortillas'
            return k
    return None

# ---------- unit conversion ----------
VOL = {'tsp': 1/6, 'tbsp': 0.5, 'cup': 8}            # in fl oz
OZ_PER_CUP = {  # weight-sold items measured by volume
 'jasmine rice': 6.5, 'white rice': 6.5, 'basmati rice': 6.5, 'arborio rice': 7, 'sushi rice': 7, 'quinoa': 6,
 'red lentils': 7, 'orzo': 6, 'old fashioned oats': 3.2, 'quick oats': 3.2, 'cereal': 1, 'granola': 4,
 'pancake mix': 4.5, 'flour': 4.5, 'panko': 2, 'breadcrumbs': 4, 'sugar': 7, 'brown sugar': 7.5,
 'powdered sugar': 4, 'cornstarch': 4.5, 'baking soda': 8, 'baking powder': 8, 'salt': 10,
 'cheddar shredded': 4, 'mexican cheese': 4, 'mozzarella shredded': 4, 'monterey jack': 4, 'parmesan': 3,
 'feta': 4.5, 'ricotta': 8.5, 'sour cream': 8.5, 'cream cheese': 8, 'greek yogurt': 8.5, 'yogurt': 8.5,
 'butter': 8, 'mayonnaise': 8, 'peanut butter': 9, 'jelly': 11, 'fig jam': 11, 'red pepper jelly': 11,
 'honey': 12, 'guacamole': 8.5, 'pico de gallo': 8, 'salsa': 9, 'salsa verde': 9, 'hummus': 8.5,
 'creme fraiche': 8, 'pizza sauce': 8.5, 'marinara': 8.5, 'tomato paste': 9, 'sriracha': 9.5,
 'bbq sauce': 10, 'sweet soy glaze': 10, 'dijon mustard': 9, 'whole grain mustard': 9, 'yellow mustard': 9,
 'red curry paste': 9, 'bouillon paste': 9.6, 'beef bouillon paste': 9.6, 'vegetable bouillon paste': 9.6,
 'chocolate chips': 6, 'pecans': 4, 'peanuts': 5, 'cashews': 5, 'pistachios': 4.3, 'sliced almonds': 3,
 'dried cranberries': 4.2, 'sesame seeds': 5, 'crispy fried onions': 2, 'croutons': 1.5, 'tortilla chips': 1,
 'sun dried tomatoes': 4, 'frozen peas': 5, 'frozen mixed vegetables': 5, 'frozen corn': 5,
 'frozen peas and carrots': 5, 'frozen diced potatoes': 5, 'shredded carrots': 3.5, 'red cabbage': 3,
 'spinach': 1, 'arugula': 1, 'grape tomatoes': 6, 'mushrooms': 3, 'pineapple': 6, 'berries': 5,
 'pomegranate': 6, 'black beans': 6, 'chickpeas': 6, 'diced tomatoes': 8, 'fire roasted tomatoes': 8,
 'crushed tomatoes': 8.5, 'tomato sauce': 8.5, 'cream of mushroom soup': 8.5, 'cream of chicken soup': 8.5,
 'tomato soup': 8.5, 'rotisserie chicken': 0, 'roasted red peppers': 6, 'ravioli': 4,
 'frozen cauliflower rice': 4.5, 'broccoli florets': 3, 'coleslaw mix': 3,
}
SPICE_OZ_PER_TSP = 0.1  # ~2.8 g
EACH_PER = {  # recipe unit -> how many of the package's 'each/bunch' units it uses
 ('garlic', 'clove'): 0.1, ('ginger', 'thumb'): 0.25, ('ginger', 'inch'): 0.25, ('ginger', 'tsp'): 0.08,
 ('ginger', 'tbsp'): 0.25, ('scallions', 'each'): 1/6, ('scallions', 'cup'): 0.75, ('celery', 'stalk'): 0.1,
 ('celery', 'oz'): 0.05, ('cilantro', 'oz'): 0.5, ('cilantro', 'cup'): 0.5, ('parsley', 'oz'): 0.5,
 ('parsley', 'tbsp'): 0.05, ('parsley', 'tsp'): 0.02, ('garlic', 'tsp'): 0.1, ('garlic', 'tbsp'): 0.3,
 ('onion', 'cup'): 1, ('lime', 'tbsp'): 0.5, ('lemon', 'tbsp'): 0.33, ('cauliflower', 'head'): 1,
 ('lettuce', 'head'): 1, ('lettuce', 'leaf'): 0.08, ('bell pepper', 'cup'): 1, ('carrots', 'each'): 0.15,
 ('broccoli', 'oz'): 1/12, ('zucchini', 'each'): 1, ('rotisserie chicken', 'cup'): 0.33,
 ('rotisserie chicken', 'oz'): 1/24, ('rotisserie chicken', 'lb'): 0.67, ('cucumber', 'each'): 1,
 ('banana', 'each'): 1, ('carrots', 'cup'): 0.3, ('potatoes', 'each'): 0.1, ('bell pepper', 'each'): 1,
 ('onion', 'each'): 1, ('eggplant', 'each'): 1, ('avocado', 'each'): 1,
}
WEIGHT = {'oz': 1, 'lb': 16}

def need_in_pkg_units(key, qty, unit):
    """Return quantity measured in the package's unit, or None if unknown."""
    p = P.get(key)
    if not p: return None
    pu = p['unit']
    u = unit.lower()
    if u in ('pinch', 'spray'): return 0.0  # negligible
    if (key, u) in EACH_PER: return qty * EACH_PER[(key, u)]
    if pu == u or (pu == 'each' and u in ('each', 'packet')) or (pu in ('slice',) and u == 'slice'):
        return qty
    if pu in ('bunch', 'each') and u == 'each': return qty
    if pu in WEIGHT and u in WEIGHT: return qty * WEIGHT[u] / WEIGHT[pu]
    if pu == 'fl oz' and u in VOL: return qty * VOL[u]
    if pu == 'fl oz' and u == 'oz': return qty
    if pu == 'fl oz' and u == 'ml': return qty / 29.6
    if pu in WEIGHT and u in VOL:
        if key in OZ_PER_CUP and OZ_PER_CUP[key]:
            return qty * VOL[u] / 8 * OZ_PER_CUP[key] / WEIGHT[pu]
        return qty * VOL[u] / 8 * (SPICE_OZ_PER_TSP * 48) / WEIGHT[pu]  # treat as spice
    if pu in WEIGHT and u == 'packet':
        return {'tomato paste': 1, 'bouillon paste': 0.17, 'beef bouillon paste': 0.17,
                'vegetable bouillon paste': 0.17, 'crispy fried onions': 1, 'croutons': 1,
                'red pepper jelly': 1.5, 'fig jam': 1.5, 'ramen': 1}.get(key, 1) / WEIGHT[pu]
    if pu == 'each' and u in WEIGHT and key in ('onion', 'red onion', 'shallot', 'bell pepper', 'zucchini', 'tomato'):
        return qty * WEIGHT[u] / 8
    if pu == 'each' and u == 'can (15 oz)': return qty
    if pu in WEIGHT and u == 'can (15 oz)': return qty * 15 / WEIGHT[pu]
    if pu == 'each' and u == 'head': return qty
    if pu == 'slice' and u == 'each': return qty
    if pu == 'packet' and u == 'packet': return qty
    if pu == 'bunch' and u == 'bunch': return qty
    if pu == 'oz' and u == 'bag': return qty * p['size']
    return None

EACH_PER.update({('apple','oz'):1/6, ('apple','cup'):0.5, ('avocado','tbsp'):1/8, ('avocado','each'):1,
  ('banana','each'):1})
EXTRA = {('gouda','slice'):0.75, ('sweet potatoes','each'):0.6, ('nori','each'):0.077,
  ('chicken thighs bone-in','each'):0.4, ('lasagna noodles','each'):0.8, ('roasted red peppers','each'):1.5,
  ('sour cream','each'):4}
_orig = need_in_pkg_units
def need_in_pkg_units(key, qty, unit):
    if (key, unit) in EXTRA: return qty * EXTRA[(key, unit)]
    return _orig(key, qty, unit)
# homemade blends/sauces: estimated cost per recipe-unit packet, priced from the spice list
BLEND_COST = {'southwest spice blend':0.30,'shawarma spice blend':0.40,'mexican spice blend':0.30,
 'tunisian spice blend':0.45,'fry seasoning':0.25,'sweet & smoky bbq seasoning':0.30,'tex-mex paste':0.25,
 'smoky red pepper crema':0.30,'umami ginger sauce':0.35,'pork rub':0.35}
BLEND_UNIT = {'tbsp':1,'packet':1}

def ingredient_cost(i):
    """(cost of the amount used, price key or None)"""
    n = re.sub(r'\s*\(.*?\)','',i['item'].lower()).strip()
    if n in BLEND_COST:
        q = i['qty'] if i['unit'] in ('tbsp','packet') else i['qty']/2
        return BLEND_COST[n]*q, 'blend'
    k = key_for(i['item'])
    if not k or P.get(k) is None: return 0.0, k
    q = need_in_pkg_units(k, i['qty'], i['unit'])
    if q is None: return 0.0, k
    p = P[k]
    return p['price'] * q / p['size'], k
