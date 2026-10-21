import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { INGREDIENT_CATALOG } from '../../content/catalog';
import { INGREDIENTS } from '../../content/ingredients';
import {
  MEAL_TYPES,
  RECIPE_LIMITS,
  hasRecipeErrors,
  nutritionPerServing,
  validateRecipe,
} from '../../domain/recipes/recipe';
import type { MealType, NewRecipe, Recipe, RecipeErrors } from '../../domain/recipes/recipe';
import type { FieldProblem } from '../../domain/validation';
import { CATEGORY_LABELS, CATEGORY_ORDER, MEAL_TYPE_LABELS } from './labels';
import { NutritionSummary } from './NutritionSummary';
import './RecipeForm.css';

interface IngredientRowValues {
  /** Stable React key; rows have no natural identity. */
  key: string;
  ingredientId: string;
  grams: string;
}

interface FormValues {
  name: string;
  mealType: MealType;
  servings: string;
  prepMinutes: string;
  rows: IngredientRowValues[];
  /** One preparation step per line. */
  steps: string;
}

const NAME_MESSAGES: Record<FieldProblem, string> = {
  required: 'Wpisz nazwę przepisu.',
  invalid: `Nazwa może mieć maksymalnie ${RECIPE_LIMITS.nameMaxLength} znaków.`,
};

const SERVINGS_MESSAGES: Record<FieldProblem, string> = {
  required: 'Podaj liczbę porcji.',
  invalid: `Podaj liczbę porcji w pełnych liczbach, od ${RECIPE_LIMITS.servings.min} do ${RECIPE_LIMITS.servings.max}.`,
};

const PREP_MINUTES_MESSAGES: Record<FieldProblem, string> = {
  required: 'Podaj czas przygotowania.',
  invalid: `Podaj czas w pełnych minutach, od ${RECIPE_LIMITS.prepMinutes.min} do ${RECIPE_LIMITS.prepMinutes.max}.`,
};

const INGREDIENT_MESSAGES: Record<FieldProblem, string> = {
  required: 'Wybierz składnik.',
  invalid: 'Wybierz składnik z listy.',
};

const GRAMS_MESSAGES: Record<FieldProblem, string> = {
  required: 'Podaj ilość.',
  invalid: `Podaj ilość w gramach, od ${RECIPE_LIMITS.grams.min} do ${RECIPE_LIMITS.grams.max}.`,
};

/** Ingredients grouped by food group, each group sorted alphabetically for the picker. */
const INGREDIENT_GROUPS = CATEGORY_ORDER.map((category) => ({
  category,
  ingredients: INGREDIENTS.filter((ingredient) => ingredient.category === category).sort((a, b) =>
    a.name.localeCompare(b.name, 'pl'),
  ),
})).filter((group) => group.ingredients.length > 0);

interface RecipeFormProps {
  /** Present when editing an existing recipe. */
  initialValues?: Recipe;
  submitLabel: string;
  onSubmit: (recipe: NewRecipe) => Promise<void>;
  onCancel: () => void;
}

export function RecipeForm({ initialValues, submitLabel, onSubmit, onCancel }: RecipeFormProps) {
  const [values, setValues] = useState<FormValues>(() =>
    initialValues ? toFormValues(initialValues) : emptyValues(),
  );
  // Errors only appear after the first submit attempt, and from then on they
  // follow the input, so a fixed field stops complaining immediately.
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const rowToFocus = useRef<string | null>(null);

  const errors = showErrors ? validateRecipe(toDraft(values), INGREDIENT_CATALOG) : undefined;
  const preview = useMemo(() => previewNutrition(values), [values]);

  // Move focus to a freshly added row once it exists in the DOM.
  useEffect(() => {
    if (rowToFocus.current === null) return;
    formRef.current
      ?.querySelector<HTMLElement>(`[data-row-key="${rowToFocus.current}"] select`)
      ?.focus();
    rowToFocus.current = null;
  });

  function setField<K extends keyof Omit<FormValues, 'rows'>>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateRow(key: string, changes: Partial<Omit<IngredientRowValues, 'key'>>) {
    setValues((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.key === key ? { ...row, ...changes } : row)),
    }));
  }

  function addRow() {
    const row = newRow();
    rowToFocus.current = row.key;
    setValues((current) => ({ ...current, rows: [...current.rows, row] }));
  }

  function removeRow(key: string) {
    setValues((current) => ({ ...current, rows: current.rows.filter((row) => row.key !== key) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const draft = toDraft(values);
    const problems = validateRecipe(draft, INGREDIENT_CATALOG);
    setShowErrors(true);

    if (hasRecipeErrors(problems)) {
      const control = form.elements.namedItem(firstInvalidControl(problems) ?? '');
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: draft.name.trim(),
        mealType: values.mealType,
        servings: draft.servings,
        prepMinutes: draft.prepMinutes,
        ingredients: draft.ingredients,
        steps: parseSteps(values.steps),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="recipe-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${formId}-name`}>
          Nazwa
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          className="input"
          type="text"
          autoComplete="off"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? `${formId}-name-error` : undefined}
        />
        <FieldError
          id={`${formId}-name-error`}
          message={errors?.name && NAME_MESSAGES[errors.name]}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${formId}-meal-type`}>
          Rodzaj posiłku
        </label>
        <select
          id={`${formId}-meal-type`}
          name="mealType"
          className="input"
          value={values.mealType}
          onChange={(event) => {
            const next = MEAL_TYPES.find((type) => type === event.target.value);
            if (next) setField('mealType', next);
          }}
        >
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {MEAL_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="recipe-form__pair">
        <NumberField
          id={`${formId}-servings`}
          name="servings"
          label="Liczba porcji"
          min={RECIPE_LIMITS.servings.min}
          max={RECIPE_LIMITS.servings.max}
          step={1}
          value={values.servings}
          onChange={(value) => setField('servings', value)}
          error={errors?.servings && SERVINGS_MESSAGES[errors.servings]}
        />
        <NumberField
          id={`${formId}-prep`}
          name="prepMinutes"
          label="Czas (minuty)"
          min={RECIPE_LIMITS.prepMinutes.min}
          max={RECIPE_LIMITS.prepMinutes.max}
          step={1}
          value={values.prepMinutes}
          onChange={(value) => setField('prepMinutes', value)}
          error={errors?.prepMinutes && PREP_MINUTES_MESSAGES[errors.prepMinutes]}
        />
      </div>

      <fieldset className="field recipe-form__ingredients">
        <legend className="field__label">Składniki (łączne ilości na wszystkie porcje)</legend>

        {values.rows.map((row, index) => {
          const rowErrors = errors?.rows[index];

          return (
            <div key={row.key} className="ingredient-row" data-row-key={row.key}>
              <div className="field">
                <label className="field__label" htmlFor={`${formId}-ingredient-${index}`}>
                  Składnik {index + 1}
                </label>
                <select
                  id={`${formId}-ingredient-${index}`}
                  name={`ingredient-${index}`}
                  className="input"
                  value={row.ingredientId}
                  onChange={(event) => updateRow(row.key, { ingredientId: event.target.value })}
                  aria-invalid={rowErrors?.ingredientId ? true : undefined}
                  aria-describedby={
                    rowErrors?.ingredientId ? `${formId}-ingredient-${index}-error` : undefined
                  }
                >
                  <option value="">Wybierz składnik…</option>
                  {INGREDIENT_GROUPS.map(({ category, ingredients }) => (
                    <optgroup key={category} label={CATEGORY_LABELS[category]}>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <FieldError
                  id={`${formId}-ingredient-${index}-error`}
                  message={rowErrors?.ingredientId && INGREDIENT_MESSAGES[rowErrors.ingredientId]}
                />
              </div>

              <NumberField
                id={`${formId}-grams-${index}`}
                name={`grams-${index}`}
                label={`Ilość składnika ${index + 1} (g)`}
                min={RECIPE_LIMITS.grams.min}
                max={RECIPE_LIMITS.grams.max}
                step="any"
                value={row.grams}
                onChange={(value) => updateRow(row.key, { grams: value })}
                error={rowErrors?.grams && GRAMS_MESSAGES[rowErrors.grams]}
              />

              <button
                type="button"
                className="btn btn--small ingredient-row__remove"
                aria-label={`Usuń składnik ${index + 1}`}
                disabled={values.rows.length === 1}
                onClick={() => removeRow(row.key)}
              >
                Usuń
              </button>
            </div>
          );
        })}

        <button type="button" className="btn btn--small" onClick={addRow}>
          Dodaj składnik
        </button>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={`${formId}-steps`}>
          Przygotowanie (jeden krok w jednej linii)
        </label>
        <textarea
          id={`${formId}-steps`}
          name="steps"
          className="input"
          rows={6}
          value={values.steps}
          onChange={(event) => setField('steps', event.target.value)}
        />
      </div>

      <h2>Wartości odżywcze na jedną porcję</h2>
      {preview ? (
        <NutritionSummary nutrients={preview} />
      ) : (
        <p className="field__hint">
          Wybierz składniki, podaj ich ilość i liczbę porcji, a pokażemy kalorie i makroskładniki.
        </p>
      )}

      <div className="recipe-form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitLabel}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Anuluj
        </button>
      </div>
    </form>
  );
}

interface NumberFieldProps {
  id: string;
  name: string;
  label: string;
  min: number;
  max: number;
  step: number | 'any';
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function NumberField({
  id,
  name,
  label,
  min,
  max,
  step,
  value,
  onChange,
  error,
}: NumberFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

function newRow(): IngredientRowValues {
  return { key: crypto.randomUUID(), ingredientId: '', grams: '' };
}

function emptyValues(): FormValues {
  return {
    name: '',
    mealType: 'lunch',
    servings: '2',
    prepMinutes: '',
    rows: [newRow()],
    steps: '',
  };
}

function toFormValues(recipe: Recipe): FormValues {
  return {
    name: recipe.name,
    mealType: recipe.mealType,
    servings: String(recipe.servings),
    prepMinutes: String(recipe.prepMinutes),
    rows: recipe.ingredients.map(({ ingredientId, grams }) => ({
      key: crypto.randomUUID(),
      ingredientId,
      grams: String(grams),
    })),
    steps: recipe.steps.join('\n'),
  };
}

function toDraft(values: FormValues) {
  return {
    name: values.name,
    servings: parseNumber(values.servings),
    prepMinutes: parseNumber(values.prepMinutes),
    ingredients: values.rows.map(({ ingredientId, grams }) => ({
      ingredientId,
      grams: parseNumber(grams),
    })),
  };
}

/** Empty input is NaN rather than 0, so "nothing typed" is not mistaken for a value. */
function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function parseSteps(text: string): string[] {
  return text
    .split('\n')
    .map((step) => step.trim())
    .filter((step) => step !== '');
}

/** Name of the first form control with a problem, in the order they appear on screen. */
function firstInvalidControl(problems: RecipeErrors): string | undefined {
  if (problems.name) return 'name';
  if (problems.servings) return 'servings';
  if (problems.prepMinutes) return 'prepMinutes';

  for (const [index, row] of problems.rows.entries()) {
    if (row.ingredientId) return `ingredient-${index}`;
    if (row.grams) return `grams-${index}`;
  }
  return undefined;
}

/** Nutrition per serving from whatever is filled in so far, or null if there is not enough yet. */
function previewNutrition(values: FormValues) {
  const servings = parseNumber(values.servings);
  const ingredients = values.rows.flatMap((row) => {
    const grams = parseNumber(row.grams);
    const usable = INGREDIENT_CATALOG.has(row.ingredientId) && Number.isFinite(grams) && grams > 0;
    return usable ? [{ ingredientId: row.ingredientId, grams }] : [];
  });

  if (ingredients.length === 0 || !(servings >= 1)) return null;
  return nutritionPerServing({ ingredients, servings }, INGREDIENT_CATALOG);
}
