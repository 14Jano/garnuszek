import type { Allergen, IngredientCategory } from '../domain/recipes/ingredient';
import type { Diet, MealType } from '../domain/recipes/recipe';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
};

/** Plural forms for filters and headings. */
export const MEAL_TYPE_PLURAL_LABELS: Record<MealType, string> = {
  breakfast: 'Śniadania',
  lunch: 'Obiady',
  dinner: 'Kolacje',
};

export const DIET_LABELS: Record<Diet, string> = {
  pescatarian: 'Peskatariańskie',
  vegetarian: 'Wegetariańskie',
  vegan: 'Wegańskie',
};

/** The diets as a person follows them, said in full where they are chosen. */
export const DIET_CHOICE_LABELS: Record<Diet, string> = {
  pescatarian: 'Peskatariańska (bez mięsa)',
  vegetarian: 'Wegetariańska (bez mięsa i ryb)',
  vegan: 'Wegańska (bez mięsa, ryb, nabiału i jajek)',
};

/** The diets as an adjective of "dieta", for sentences. */
export const DIET_ADJECTIVES: Record<Diet, string> = {
  pescatarian: 'peskatariańska',
  vegetarian: 'wegetariańska',
  vegan: 'wegańska',
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  milk: 'Mleko i nabiał',
  eggs: 'Jajka',
  fish: 'Ryby',
  peanuts: 'Orzeszki ziemne',
  'tree-nuts': 'Orzechy',
  soy: 'Soja',
  sesame: 'Sezam',
};

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  vegetables: 'Warzywa',
  fruit: 'Owoce',
  meat: 'Mięso',
  fish: 'Ryby',
  dairy: 'Nabiał',
  eggs: 'Jajka',
  grains: 'Zboża i pieczywo',
  legumes: 'Rośliny strączkowe',
  nuts: 'Orzechy i nasiona',
  fats: 'Tłuszcze',
  other: 'Inne',
};
