import type { IngredientCategory } from '../../domain/recipes/ingredient';
import type { Diet, MealType } from '../../domain/recipes/recipe';

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

/** Order in which food groups are listed in pickers. */
export const CATEGORY_ORDER: readonly IngredientCategory[] = [
  'vegetables',
  'fruit',
  'meat',
  'fish',
  'dairy',
  'eggs',
  'grains',
  'legumes',
  'nuts',
  'fats',
  'other',
];
