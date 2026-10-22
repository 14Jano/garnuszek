import { useId, useRef } from 'react';
import { IngredientOptions } from '../../components/IngredientOptions';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { ALLERGEN_LABELS, DIET_CHOICE_LABELS } from '../../content/labels';
import type { Restrictions } from '../../domain/household/restrictions';
import { ALLERGENS, requireIngredient } from '../../domain/recipes/ingredient';
import type { Allergen } from '../../domain/recipes/ingredient';
import { DIETS } from '../../domain/recipes/recipe';
import './RestrictionsFields.css';

interface RestrictionsFieldsProps {
  value: Restrictions;
  onChange: (next: Restrictions) => void;
}

/** What a person does not eat: a diet, allergens and single ingredients. */
export function RestrictionsFields({ value, onChange }: RestrictionsFieldsProps) {
  const id = useId();
  const addSelect = useRef<HTMLSelectElement>(null);

  function toggleAllergen(allergen: Allergen, avoided: boolean) {
    onChange({
      ...value,
      allergens: ALLERGENS.filter((candidate) =>
        candidate === allergen ? avoided : value.allergens.includes(candidate),
      ),
    });
  }

  function removeIngredient(ingredientId: string) {
    onChange({
      ...value,
      avoidedIngredientIds: value.avoidedIngredientIds.filter((other) => other !== ingredientId),
    });
    // The button that was pressed is about to go away, so keep the place in the form.
    addSelect.current?.focus();
  }

  return (
    <fieldset className="field restrictions">
      <legend className="field__label">Czego unika</legend>
      <p className="field__hint">
        Garnuszek ostrzeże, gdy w zaplanowanym daniu jest coś z tej listy, domyślnie ukryje takie
        dania przy wyborze dania i nie zaproponuje ich w automatycznym planie tygodnia. To pomoc w
        planowaniu, a nie gwarancja: przy alergii zawsze czytaj etykiety produktów.
      </p>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-diet`}>
          Dieta
        </label>
        <select
          id={`${id}-diet`}
          className="input"
          value={value.diet ?? ''}
          onChange={(event) => {
            const diet = DIETS.find((candidate) => candidate === event.target.value);
            onChange({
              allergens: value.allergens,
              avoidedIngredientIds: value.avoidedIngredientIds,
              ...(diet ? { diet } : {}),
            });
          }}
        >
          <option value="">Je wszystko</option>
          {DIETS.map((diet) => (
            <option key={diet} value={diet}>
              {DIET_CHOICE_LABELS[diet]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="field">
        <legend className="field__label">Alergie i nietolerancje</legend>
        <div className="choice-group">
          {ALLERGENS.map((allergen) => (
            <label key={allergen} className="choice">
              <input
                type="checkbox"
                checked={value.allergens.includes(allergen)}
                onChange={(event) => toggleAllergen(allergen, event.target.checked)}
              />
              {ALLERGEN_LABELS[allergen]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-add`}>
          Inne składniki, których unika
        </label>
        <select
          id={`${id}-add`}
          ref={addSelect}
          className="input"
          value=""
          onChange={(event) => {
            if (event.target.value === '') return;
            onChange({
              ...value,
              avoidedIngredientIds: [...value.avoidedIngredientIds, event.target.value],
            });
          }}
        >
          <option value="">Dodaj składnik…</option>
          <IngredientOptions exclude={value.avoidedIngredientIds} />
        </select>

        {value.avoidedIngredientIds.length > 0 && (
          <ul className="restrictions__chosen" aria-label="Składniki, których unika">
            {value.avoidedIngredientIds.map((ingredientId) => {
              const { name } = requireIngredient(ingredientId, INGREDIENT_CATALOG);

              return (
                <li key={ingredientId} className="restrictions__item">
                  <span>{name}</span>
                  <button
                    type="button"
                    className="btn btn--small"
                    aria-label={`Nie unika już: ${name}`}
                    onClick={() => removeIngredient(ingredientId)}
                  >
                    Usuń
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
