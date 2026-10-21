import { X } from 'lucide-react';
import { useId } from 'react';
import { IngredientOptions } from '../../components/IngredientOptions';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import './FridgeFilter.css';

interface FridgeFilterProps {
  /** Ids of the ingredients the user has at home. */
  selected: readonly string[];
  onChange: (ingredientIds: string[]) => void;
}

/** "What can I cook with what I have": pick ingredients and only matching recipes remain. */
export function FridgeFilter({ selected, onChange }: FridgeFilterProps) {
  const selectId = useId();

  return (
    <details className="fridge">
      <summary>
        Co ugotować z tego, co mam
        {selected.length > 0 && ` (${selected.length})`}
      </summary>

      <div className="field">
        <label className="field__label" htmlFor={selectId}>
          Dodaj składnik
        </label>
        <select
          id={selectId}
          className="input"
          // Always back to the prompt, so the picker works for adding the next one too.
          value=""
          onChange={(event) => {
            if (event.target.value) onChange([...selected, event.target.value]);
          }}
        >
          <option value="">Wybierz składnik…</option>
          <IngredientOptions exclude={selected} />
        </select>
        <p className="field__hint">Pokażemy dania, które zawierają wszystkie wybrane składniki.</p>
      </div>

      {selected.length > 0 && (
        <ul className="fridge__chips" aria-label="Składniki, które masz">
          {selected.map((id) => {
            const name = INGREDIENT_CATALOG.get(id)?.name ?? id;

            return (
              <li key={id}>
                <button
                  type="button"
                  className="fridge__chip"
                  aria-label={`Usuń z listy: ${name}`}
                  onClick={() => onChange(selected.filter((other) => other !== id))}
                >
                  {name}
                  <X aria-hidden="true" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
