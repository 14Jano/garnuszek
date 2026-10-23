import type {
  Allergen,
  Ingredient,
  IngredientCategory,
  Purchase,
} from '../domain/recipes/ingredient';

/** How the shopping list counts an ingredient. Leave it out to list the weight in grams. */
type Packaging = Pick<Ingredient, 'purchase' | 'gramsPerMl'>;

const counted = (unit: Purchase['unit']) => (grams: number) => ({
  purchase: { unit, grams },
});

// Typical sizes in a Polish shop. A can is the drained weight, because that is what the
// recipes weigh. When a shop's size differs the list still says how many grams are needed.
const piece = counted('piece');
const head = counted('head');
const can = counted('can');
const pack = counted('pack');
const loaf = counted('loaf');

/** Liquids are weighed in the recipes but bought by volume. */
const liquid = (gramsPerMl: number): Packaging => ({ gramsPerMl });

function food(
  id: string,
  name: string,
  category: IngredientCategory,
  kcal: number,
  proteinG: number,
  fatG: number,
  carbsG: number,
  packaging: Packaging = {},
): Ingredient {
  return { id, name, category, per100g: { kcal, proteinG, fatG, carbsG }, ...packaging };
}

/**
 * Built-in ingredient catalog. Values are per 100 g, rounded, and meant as
 * everyday estimates in line with USDA FoodData Central: raw or dry as bought,
 * canned goods drained. See docs/DATA.md for how they were chosen and checked.
 */
const ROWS: readonly Ingredient[] = [
  // Grains and bread
  food('oats', 'Płatki owsiane', 'grains', 379, 13.2, 6.5, 67.7),
  food('rice', 'Ryż biały (suchy)', 'grains', 365, 7.1, 0.7, 80),
  food('buckwheat', 'Kasza gryczana (sucha)', 'grains', 343, 13.3, 3.4, 71.5),
  food('millet', 'Kasza jaglana (sucha)', 'grains', 378, 11, 4.2, 73),
  food('pasta', 'Makaron pszenny (suchy)', 'grains', 371, 13, 1.5, 74.7),
  food('wholegrain-pasta', 'Makaron razowy (suchy)', 'grains', 350, 13, 2.5, 69),
  food('wholegrain-bread', 'Chleb pełnoziarnisty', 'grains', 252, 12.5, 3.5, 42.7, loaf(500)),
  food('tortilla', 'Tortilla pszenna', 'grains', 304, 8.2, 7.8, 50.5, piece(60)),
  food('flour', 'Mąka pszenna', 'grains', 364, 10.3, 1, 76.3),

  // Dairy
  food('milk', 'Mleko 2%', 'dairy', 50, 3.3, 2, 4.8, liquid(1.03)),
  food('yogurt', 'Jogurt naturalny', 'dairy', 61, 3.5, 3.3, 4.7),
  food('greek-yogurt', 'Jogurt grecki', 'dairy', 97, 9, 5, 3.9),
  food('quark', 'Twaróg półtłusty', 'dairy', 133, 18, 5, 3.5, pack(250)),
  food('feta', 'Ser feta', 'dairy', 264, 14.2, 21.3, 4.1),
  food('cheese', 'Ser żółty', 'dairy', 356, 25, 27.4, 2.2),
  food('mozzarella', 'Mozzarella', 'dairy', 280, 28, 17, 3.1, pack(125)),
  food('parmesan', 'Parmezan', 'dairy', 431, 38.5, 28.6, 4.1),
  food('butter', 'Masło', 'dairy', 717, 0.9, 81.1, 0.1, pack(200)),
  food('cream', 'Śmietana 18%', 'dairy', 185, 2.6, 18, 3.2),

  // Eggs
  food('egg', 'Jajko', 'eggs', 143, 12.6, 9.5, 0.7, piece(55)),

  // Meat
  food('chicken-breast', 'Pierś z kurczaka (surowa)', 'meat', 120, 22.5, 2.6, 0),
  food('ground-beef', 'Mięso mielone wołowe', 'meat', 176, 20, 10, 0),
  food('ground-turkey', 'Mięso mielone z indyka', 'meat', 150, 18.7, 8.3, 0),
  food('pork-loin', 'Schab wieprzowy (surowy)', 'meat', 143, 21, 6, 0),
  food('beef-sirloin', 'Polędwica wołowa (surowa)', 'meat', 143, 21.5, 5.8, 0),

  // Fish
  food('salmon', 'Łosoś (filet, surowy)', 'fish', 208, 20.4, 13.4, 0),
  food('cod', 'Dorsz (filet, surowy)', 'fish', 82, 17.8, 0.7, 0),
  food('tuna', 'Tuńczyk w sosie własnym', 'fish', 116, 25.5, 0.8, 0, can(120)),

  // Legumes and soy
  food('red-lentils', 'Soczewica czerwona (sucha)', 'legumes', 352, 24.6, 1.1, 63.4),
  food('chickpeas', 'Ciecierzyca z puszki (odsączona)', 'legumes', 139, 7.1, 2.6, 22.5, can(240)),
  food(
    'kidney-beans',
    'Fasola czerwona z puszki (odsączona)',
    'legumes',
    105,
    7,
    0.5,
    17.5,
    can(240),
  ),
  food('tofu', 'Tofu naturalne', 'legumes', 144, 17.3, 8.7, 2.8, pack(200)),
  food('hummus', 'Hummus', 'legumes', 166, 7.9, 9.6, 14.3, pack(200)),
  food('green-peas', 'Groszek zielony (mrożony)', 'legumes', 77, 5.2, 0.4, 13.6),

  // Vegetables
  food('onion', 'Cebula', 'vegetables', 40, 1.1, 0.1, 9.3),
  food('garlic', 'Czosnek', 'vegetables', 149, 6.4, 0.5, 33, head(40)),
  food('carrot', 'Marchew', 'vegetables', 41, 0.9, 0.2, 9.6),
  food('potato', 'Ziemniaki', 'vegetables', 77, 2, 0.1, 17.5),
  food('sweet-potato', 'Bataty', 'vegetables', 86, 1.6, 0.1, 20.1),
  food('tomato', 'Pomidor', 'vegetables', 18, 0.9, 0.2, 3.9),
  food('canned-tomatoes', 'Pomidory krojone z puszki', 'vegetables', 24, 1.2, 0.3, 4.3, can(400)),
  food('tomato-paste', 'Koncentrat pomidorowy', 'vegetables', 82, 4.3, 0.5, 18.9),
  food('cucumber', 'Ogórek', 'vegetables', 15, 0.7, 0.1, 3.6),
  food('bell-pepper', 'Papryka czerwona', 'vegetables', 31, 1, 0.3, 6, piece(150)),
  food('zucchini', 'Cukinia', 'vegetables', 17, 1.2, 0.3, 3.1, piece(300)),
  food('broccoli', 'Brokuł', 'vegetables', 34, 2.8, 0.4, 6.6, piece(300)),
  food('spinach', 'Szpinak', 'vegetables', 23, 2.9, 0.4, 3.6),
  food('lettuce', 'Sałata', 'vegetables', 17, 1.2, 0.3, 3.3, head(150)),
  food('mushrooms', 'Pieczarki', 'vegetables', 22, 3.1, 0.3, 3.3),
  food('pumpkin', 'Dynia', 'vegetables', 26, 1, 0.1, 6.5),
  food('white-cabbage', 'Kapusta biała', 'vegetables', 25, 1.3, 0.1, 5.8),
  food('sweetcorn', 'Kukurydza z puszki', 'vegetables', 81, 2.3, 1, 18, can(285)),
  food('olives', 'Oliwki (z zalewy, odsączone)', 'vegetables', 115, 0.8, 10.7, 6.3),

  // Fruit
  food('avocado', 'Awokado', 'fruit', 160, 2, 14.7, 8.5, piece(140)),
  food('banana', 'Banan', 'fruit', 89, 1.1, 0.3, 22.8, piece(120)),
  food('apple', 'Jabłko', 'fruit', 52, 0.3, 0.2, 13.8),
  food('strawberries', 'Truskawki', 'fruit', 32, 0.7, 0.3, 7.7),
  food('blueberries', 'Borówki', 'fruit', 57, 0.7, 0.3, 14.5),
  food('raspberries', 'Maliny', 'fruit', 52, 1.2, 0.7, 11.9),
  // The recipes use a lemon for its juice and zest, so a lemon counts as 40 g.
  food('lemon', 'Cytryna', 'fruit', 22, 0.4, 0.2, 6.9, piece(40)),
  food('orange', 'Pomarańcza', 'fruit', 47, 0.9, 0.1, 11.8, piece(150)),
  food('raisins', 'Rodzynki', 'fruit', 299, 3.1, 0.5, 79.2),

  // Nuts and seeds
  food('walnuts', 'Orzechy włoskie', 'nuts', 654, 15.2, 65.2, 13.7),
  food('almonds', 'Migdały', 'nuts', 579, 21.2, 49.9, 21.6),
  food('peanut-butter', 'Masło orzechowe', 'nuts', 588, 25, 50, 20),
  food('chia', 'Nasiona chia', 'nuts', 486, 16.5, 30.7, 42.1),
  food('flaxseed', 'Siemię lniane', 'nuts', 534, 18.3, 42.2, 28.9),
  food('pumpkin-seeds', 'Pestki dyni', 'nuts', 559, 30.2, 49, 10.7),
  food('tahini', 'Pasta tahini', 'nuts', 595, 17, 53.8, 21.2),

  // Oils
  food('olive-oil', 'Oliwa z oliwek', 'fats', 884, 0, 100, 0, liquid(0.92)),
  food('rapeseed-oil', 'Olej rzepakowy', 'fats', 884, 0, 100, 0, liquid(0.92)),

  // Other
  food('coconut-milk', 'Mleko kokosowe (z puszki)', 'other', 197, 2, 21.3, 2.8, can(400)),
  food('soy-milk', 'Napój sojowy niesłodzony', 'other', 33, 2.9, 1.6, 1.7, liquid(1.03)),
  food('soy-sauce', 'Sos sojowy', 'other', 53, 8.1, 0.6, 4.9, liquid(1.2)),
];

/**
 * The allergens each ingredient contains. This is the one place to audit, because
 * a mistake here can put an allergen on someone's plate: when in doubt, add it.
 * Oats count as gluten, as on EU labels, because they are usually grown and milled
 * with wheat. Buckwheat, millet and rice are gluten-free. Soy sauce is brewed with
 * wheat. Hummus is made with tahini, so it contains sesame.
 */
const ALLERGENS_BY_INGREDIENT: Readonly<Record<string, readonly Allergen[]>> = {
  oats: ['gluten'],
  pasta: ['gluten'],
  'wholegrain-pasta': ['gluten'],
  'wholegrain-bread': ['gluten'],
  tortilla: ['gluten'],
  flour: ['gluten'],
  'soy-sauce': ['gluten', 'soy'],

  milk: ['milk'],
  yogurt: ['milk'],
  'greek-yogurt': ['milk'],
  quark: ['milk'],
  feta: ['milk'],
  cheese: ['milk'],
  mozzarella: ['milk'],
  parmesan: ['milk'],
  butter: ['milk'],
  cream: ['milk'],

  egg: ['eggs'],

  salmon: ['fish'],
  cod: ['fish'],
  tuna: ['fish'],

  'peanut-butter': ['peanuts'],
  walnuts: ['tree-nuts'],
  almonds: ['tree-nuts'],

  tofu: ['soy'],
  'soy-milk': ['soy'],

  tahini: ['sesame'],
  hummus: ['sesame'],
};

export const INGREDIENTS: readonly Ingredient[] = ROWS.map((ingredient) => {
  const allergens = ALLERGENS_BY_INGREDIENT[ingredient.id];
  return allergens ? { ...ingredient, allergens } : ingredient;
});

/** The ids that `ALLERGENS_BY_INGREDIENT` lists, so a test can catch one that is misspelled. */
export const ALLERGEN_TABLE_IDS: readonly string[] = Object.keys(ALLERGENS_BY_INGREDIENT);
