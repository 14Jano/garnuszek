import { INGREDIENTS } from '../content/ingredients';
import { CATEGORY_LABELS } from '../content/labels';
import { INGREDIENT_CATEGORIES } from '../domain/recipes/ingredient';

/** Ingredients grouped by food group, each group sorted alphabetically. */
const GROUPS = INGREDIENT_CATEGORIES.map((category) => ({
  category,
  ingredients: INGREDIENTS.filter((ingredient) => ingredient.category === category).sort((a, b) =>
    a.name.localeCompare(b.name, 'pl'),
  ),
})).filter((group) => group.ingredients.length > 0);

interface IngredientOptionsProps {
  /** Ids to leave out, e.g. ones that have already been chosen. */
  exclude?: readonly string[];
}

/** The options of a `<select>` for picking any ingredient, grouped by food group. */
export function IngredientOptions({ exclude = [] }: IngredientOptionsProps) {
  return (
    <>
      {GROUPS.map(({ category, ingredients }) => {
        const shown = ingredients.filter((ingredient) => !exclude.includes(ingredient.id));
        if (shown.length === 0) return null;

        return (
          <optgroup key={category} label={CATEGORY_LABELS[category]}>
            {shown.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
