import type { Nutrients } from '../../domain/nutrition/nutrients';
import './NutritionSummary.css';

/** Energy and macronutrients, rounded to whole numbers for display. */
export function NutritionSummary({ nutrients }: { nutrients: Nutrients }) {
  return (
    <dl className="nutrition-summary">
      <div className="nutrition-summary__item nutrition-summary__item--energy">
        <dt>Kalorie</dt>
        <dd>{Math.round(nutrients.kcal)} kcal</dd>
      </div>
      <div className="nutrition-summary__item">
        <dt>Białko</dt>
        <dd>{Math.round(nutrients.proteinG)} g</dd>
      </div>
      <div className="nutrition-summary__item">
        <dt>Tłuszcz</dt>
        <dd>{Math.round(nutrients.fatG)} g</dd>
      </div>
      <div className="nutrition-summary__item">
        <dt>Węglowodany</dt>
        <dd>{Math.round(nutrients.carbsG)} g</dd>
      </div>
    </dl>
  );
}
