import { Link } from 'react-router-dom';
import { recipePath } from '../../app/navigation';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { compatibleDiets, nutritionPerServing } from '../../domain/recipes/recipe';
import { FavoriteButton } from './FavoriteButton';
import { DIET_LABELS, MEAL_TYPE_LABELS } from './labels';
import type { RecipeEntry } from './useRecipeEntries';
import './RecipeCard.css';

export function RecipeCard({ recipe, favorite, custom }: RecipeEntry) {
  const kcal = Math.round(nutritionPerServing(recipe, INGREDIENT_CATALOG).kcal);
  // The strictest diet is listed last and implies the more permissive ones.
  const strictestDiet = compatibleDiets(recipe, INGREDIENT_CATALOG).at(-1);

  return (
    <li className="recipe-card">
      <Link className="recipe-card__link" to={recipePath.details(recipe.id)}>
        <h2 className="recipe-card__name">{recipe.name}</h2>
        <p className="recipe-card__meta">
          {MEAL_TYPE_LABELS[recipe.mealType]}, {recipe.prepMinutes} min, {kcal} kcal na porcję
        </p>
        {(strictestDiet || custom) && (
          <p className="recipe-card__badges">
            {custom && <span className="recipe-card__badge">Własny</span>}
            {strictestDiet && (
              <span className="recipe-card__badge">{DIET_LABELS[strictestDiet]}</span>
            )}
          </p>
        )}
      </Link>
      <FavoriteButton recipeId={recipe.id} recipeName={recipe.name} favorite={favorite} />
    </li>
  );
}
