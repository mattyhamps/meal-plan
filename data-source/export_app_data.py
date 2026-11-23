"""Rebuild src/data/*.json from recipe-bank.json and the ACME Havertown price list.

Run from this folder:  python3 export_app_data.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
exec(open('cost.py').read())  # defines P, need_in_pkg_units, ingredient_cost

OUT = os.path.join(HERE, '..', 'src', 'data')
d = json.load(open('recipe-bank.json'))

AISLE = {}
def A(a, keys):
    for k in keys.split(','):
        AISLE[k.strip()] = a
A('Meat & Seafood', 'ground beef,ground turkey,ground pork,italian sausage,chorizo,breakfast sausage,chicken breast,chicken thighs boneless,chicken thighs bone-in,chicken cutlets,chicken wings,pork chops,pork butt,steak,ribeye,salmon,shrimp')
A('Deli', 'rotisserie chicken,deli turkey,prosciutto,pepperoni,hummus,guacamole,pico de gallo')
A('Dairy & Eggs', 'eggs,milk,half and half,heavy cream,butter,sour cream,cream cheese,greek yogurt,yogurt,cheddar shredded,mexican cheese,mozzarella shredded,fresh mozzarella,parmesan,ricotta,gouda,american cheese,monterey jack,feta,halloumi,creme fraiche,crescent dough,biscuit dough,tofu')
A('Produce', 'onion,red onion,shallot,garlic,ginger,scallions,potatoes,sweet potatoes,carrots,shredded carrots,celery,bell pepper,red bell pepper,jalapeno,cubanelle pepper,zucchini,cucumber,mini cucumbers,english cucumber,broccoli,broccoli florets,green beans,brussels sprouts,cauliflower,eggplant,mushrooms,spinach,arugula,lettuce,coleslaw mix,red cabbage,tomato,grape tomatoes,avocado,lemon,lime,banana,apple,granny smith,pear,cilantro,parsley,dill,basil,thyme,rosemary,mint,thai basil,pomegranate,grapes,lime leaves')
A('Bakery & Bread', 'sandwich bread,sourdough bread,brioche buns,potato buns,ciabatta,baguette,english muffins,pitas,flour tortillas,large flour tortillas,corn tortillas')
A('Frozen', 'frozen meatballs,berries,belgian waffles,frozen mixed vegetables,frozen peas,frozen peas and carrots,frozen corn,frozen diced potatoes,frozen cauliflower rice')
A('Pasta, Rice & Grains', 'jasmine rice,white rice,basmati rice,arborio rice,sushi rice,quinoa,red lentils,pasta,cavatappi,rotini,orzo,egg noodles,lasagna noodles,ramen,old fashioned oats,quick oats')
A('Fresh Pasta', 'ravioli')
A('Breakfast & Cereal', 'cereal,granola,pancake mix,peanut butter,jelly,fig jam,red pepper jelly,honey,maple syrup')
A('Canned & Jarred', 'black beans,chickpeas,diced tomatoes,fire roasted tomatoes,crushed tomatoes,tomato sauce,tomato paste,marinara,pizza sauce,coconut milk,bamboo shoots,roasted red peppers,sun dried tomatoes,cream of mushroom soup,cream of chicken soup,tomato soup,chicken broth,vegetable broth,salsa,salsa verde,pineapple,canned tuna,chipotle in adobo')
A('Snacks', 'tortilla chips,croutons,crispy fried onions,peanuts,cashews,pistachios,sliced almonds,dried cranberries,pecans,chocolate chips')
A('Condiments & Sauces', 'bouillon paste,beef bouillon paste,vegetable bouillon paste,mushroom bouillon,soy sauce,sesame oil,rice vinegar,balsamic vinegar,red wine vinegar,white wine vinegar,cider vinegar,mirin,fish sauce,sriracha,hot sauce,buffalo sauce,bbq sauce,worcestershire,sweet soy glaze,ponzu,sweet chili sauce,red curry paste,gochujang,mayonnaise,dijon mustard,whole grain mustard,yellow mustard,honey dijon dressing,ranch dressing,caesar dressing,italian dressing,blue cheese dressing,balsamic glaze,liquid smoke,white wine,sherry')
A('Baking & Oils', 'flour,panko,breadcrumbs,olive oil,vegetable oil,coconut oil,cooking spray,sugar,brown sugar,powdered sugar,baking soda,baking powder,yeast,cornstarch,vanilla,cocoa powder')
A('Spices', 'salt,black pepper,garlic powder,onion powder,paprika,smoked paprika,chili powder,cumin,coriander,turmeric,cinnamon,ground ginger,oregano,basil dried,thyme dried,italian seasoning,red pepper flakes,cayenne,celery salt,poultry seasoning,dry mustard,allspice,caraway,sesame seeds,nori')
PANTRY_AISLES = {'Pasta, Rice & Grains', 'Condiments & Sauces', 'Baking & Oils', 'Spices', 'Breakfast & Cereal'}

missing = [k for k in P if k not in AISLE]
assert not missing, missing

prices = {}
for k, v in P.items():
    if v is None:
        continue
    prices[k] = dict(size=v['size'], unit=v['unit'], price=v['price'], name=v['name'], aisle=AISLE[k],
                     pantry=AISLE[k] in PANTRY_AISLES and k not in ('peanut butter', 'jelly'))

PROTEIN = ['ground beef', 'ground turkey', 'ground pork', 'italian sausage', 'chorizo', 'chicken breast',
           'chicken thighs boneless', 'chicken thighs bone-in', 'chicken cutlets', 'pork chops', 'pork butt', 'steak',
           'ribeye', 'salmon', 'shrimp', 'tofu', 'halloumi', 'breakfast sausage', 'frozen meatballs', 'ravioli']

def conv(lst):
    out = []
    for i in lst:
        k = i.get('priceKey')
        pk = None
        if k and not k.startswith('blend:') and P.get(k):
            pk = need_in_pkg_units(k, i['qty'], i['unit'])
        blendcost = round(ingredient_cost(i)[0], 3) if k and k.startswith('blend:') else None
        key = k if (k and (k.startswith('blend:') or P.get(k))) else None
        row = dict(item=i['item'], qty=i['qty'], unit=i['unit'], key=key,
                   pkg=round(pk, 4) if pk is not None else None, cost=blendcost)
        out.append({a: b for a, b in row.items() if b is not None})
    return out

meals = []
for r in d['recipes']:
    if r['plannerRole'] != 'meal':
        continue
    ing, pan = conv(r['ingredients']), conv(r['pantry'])
    anchor, best = None, 0
    for i in ing:
        if i.get('key') in PROTEIN and i.get('pkg') and P[i['key']]['unit'] in ('lb', 'oz'):
            c = i['pkg'] * P[i['key']]['price'] / P[i['key']]['size']
            if c > best:
                best, anchor = c, i['key']
    tot = (r.get('prepMin') or 0) + (r.get('cookMin') or 0)
    easy = ('Easy' in r.get('tags', [])) or tot <= 30 or r['source'] == 'Staple'
    protein = anchor or next((i['key'] for i in ing if i.get('key') in PROTEIN), None)
    meals.append(dict(id=r['id'], name=r['name'], type=r['mealType'], servings=r['servings'], prep=r.get('prepMin'),
                      cook=r.get('cookMin'), inactive=r.get('inactiveMin'), calories=r.get('calories'),
                      tags=r.get('tags', []), easy=easy, source=r['source'], anchor=anchor, protein=protein,
                      freezer=r.get('freezer'), ingredients=ing, pantry=pan, steps=r['steps'],
                      blends=r.get('blends', []), note=r.get('needsReview')))

used = {x for m in meals for x in m['blends']}
blends = [b for b in d['blends'] if b['id'] in used]
dump = lambda obj, name: json.dump(obj, open(os.path.join(OUT, name), 'w'), separators=(',', ':'), ensure_ascii=False)
dump(meals, 'meals.json')
dump(prices, 'prices.json')
dump(blends, 'blends.json')
json.dump(dict(store=d['stores']['havertown'], asOf=d['prices']['asOf'],
               budgets=d['suggestedWeeklyBudget']['byHouseholdSize']), open(os.path.join(OUT, 'meta.json'), 'w'))
print(len(meals), 'meals,', len(prices), 'prices')
