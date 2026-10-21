import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { MEMBER_LIMITS, allowedGoals, validateMember } from '../../domain/household/member';
import type { MemberErrors, MemberField, NewMember } from '../../domain/household/member';
import type { FieldProblem } from '../../domain/validation';
import { ACTIVITY_LEVELS, SEXES } from '../../domain/nutrition/calorieTarget';
import type { ActivityLevel, Goal, Sex } from '../../domain/nutrition/calorieTarget';
import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS } from './labels';
import './MemberForm.css';

interface FormValues {
  name: string;
  sex: Sex;
  age: string;
  heightCm: string;
  weightKg: string;
  activity: ActivityLevel;
  goal: Goal;
  snackKcal: string;
}

const EMPTY_VALUES: FormValues = {
  name: '',
  sex: 'female',
  age: '',
  heightCm: '',
  weightKg: '',
  activity: 'light',
  goal: 'maintain',
  snackKcal: '0',
};

const FIELD_ORDER: readonly MemberField[] = ['name', 'age', 'heightCm', 'weightKg', 'snackKcal'];

const ERROR_MESSAGES: Record<MemberField, Record<FieldProblem, string>> = {
  name: {
    required: 'Wpisz imię lub pseudonim.',
    invalid: `Imię może mieć maksymalnie ${MEMBER_LIMITS.nameMaxLength} znaków.`,
  },
  age: {
    required: 'Podaj wiek.',
    invalid: `Podaj wiek w pełnych latach, od ${MEMBER_LIMITS.age.min} do ${MEMBER_LIMITS.age.max}.`,
  },
  heightCm: {
    required: 'Podaj wzrost.',
    invalid: `Podaj wzrost w centymetrach, od ${MEMBER_LIMITS.heightCm.min} do ${MEMBER_LIMITS.heightCm.max}.`,
  },
  weightKg: {
    required: 'Podaj wagę.',
    invalid: `Podaj wagę w kilogramach, od ${MEMBER_LIMITS.weightKg.min} do ${MEMBER_LIMITS.weightKg.max}.`,
  },
  snackKcal: {
    required: 'Podaj kalorie na przekąski. Wpisz 0, jeśli ich nie planujesz.',
    invalid: `Podaj kalorie w pełnych liczbach, od ${MEMBER_LIMITS.snackKcal.min} do ${MEMBER_LIMITS.snackKcal.max}.`,
  },
};

interface MemberFormProps {
  /** Present when editing an existing member. */
  initialValues?: NewMember;
  submitLabel: string;
  onSubmit: (member: NewMember) => Promise<void>;
  onCancel: () => void;
}

export function MemberForm({ initialValues, submitLabel, onSubmit, onCancel }: MemberFormProps) {
  const [values, setValues] = useState<FormValues>(
    initialValues ? toFormValues(initialValues) : EMPTY_VALUES,
  );
  const [errors, setErrors] = useState<MemberErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();

  const age = parseNumber(values.age);
  const goals = allowedGoals(age);
  const goal = goals.includes(values.goal) ? values.goal : 'maintain';
  const goalIsLocked = goals.length === 1;

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));

    // Stop showing a field's error as soon as the user starts fixing it.
    const field = FIELD_ORDER.find((candidate) => candidate === key);
    if (field) {
      setErrors((current) => {
        if (!current[field]) return current;
        const remaining = { ...current };
        delete remaining[field];
        return remaining;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const draft = {
      name: values.name,
      age,
      heightCm: parseNumber(values.heightCm),
      weightKg: parseNumber(values.weightKg),
      snackKcal: parseNumber(values.snackKcal),
    };
    const problems = validateMember(draft);
    setErrors(problems);

    const firstInvalid = FIELD_ORDER.find((field) => problems[field]);
    if (firstInvalid) {
      const control = form.elements.namedItem(firstInvalid);
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: draft.name.trim(),
        sex: values.sex,
        age: draft.age,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        activity: values.activity,
        goal,
        snackKcal: draft.snackKcal,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function errorMessage(field: MemberField): string | undefined {
    const problem = errors[field];
    return problem ? ERROR_MESSAGES[field][problem] : undefined;
  }

  return (
    <form className="member-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${formId}-name`}>
          Imię
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          className="input"
          type="text"
          autoComplete="off"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
        />
        <FieldError id={`${formId}-name-error`} message={errorMessage('name')} />
      </div>

      <fieldset className="field">
        <legend className="field__label">Płeć</legend>
        <div className="choice-group">
          {SEXES.map((sex) => (
            <label key={sex} className="choice">
              <input
                type="radio"
                name="sex"
                value={sex}
                checked={values.sex === sex}
                onChange={() => setField('sex', sex)}
              />
              {SEX_LABELS[sex]}
            </label>
          ))}
        </div>
      </fieldset>

      <NumberField
        id={`${formId}-age`}
        name="age"
        label="Wiek (lata)"
        inputMode="numeric"
        step={1}
        min={MEMBER_LIMITS.age.min}
        max={MEMBER_LIMITS.age.max}
        value={values.age}
        onChange={(value) => setField('age', value)}
        error={errorMessage('age')}
      />

      <NumberField
        id={`${formId}-height`}
        name="heightCm"
        label="Wzrost (cm)"
        inputMode="numeric"
        step={1}
        min={MEMBER_LIMITS.heightCm.min}
        max={MEMBER_LIMITS.heightCm.max}
        value={values.heightCm}
        onChange={(value) => setField('heightCm', value)}
        error={errorMessage('heightCm')}
      />

      <NumberField
        id={`${formId}-weight`}
        name="weightKg"
        label="Waga (kg)"
        inputMode="decimal"
        step="any"
        min={MEMBER_LIMITS.weightKg.min}
        max={MEMBER_LIMITS.weightKg.max}
        value={values.weightKg}
        onChange={(value) => setField('weightKg', value)}
        error={errorMessage('weightKg')}
      />

      <div className="field">
        <label className="field__label" htmlFor={`${formId}-activity`}>
          Aktywność fizyczna
        </label>
        <select
          id={`${formId}-activity`}
          name="activity"
          className="input"
          value={values.activity}
          onChange={(event) => {
            const next = ACTIVITY_LEVELS.find((level) => level === event.target.value);
            if (next) setField('activity', next);
          }}
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {ACTIVITY_LABELS[level]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${formId}-goal`}>
          Cel
        </label>
        <select
          id={`${formId}-goal`}
          name="goal"
          className="input"
          value={goal}
          disabled={goalIsLocked}
          aria-describedby={goalIsLocked ? `${formId}-goal-hint` : undefined}
          onChange={(event) => {
            const next = goals.find((option) => option === event.target.value);
            if (next) setField('goal', next);
          }}
        >
          {goals.map((option) => (
            <option key={option} value={option}>
              {GOAL_LABELS[option]}
            </option>
          ))}
        </select>
        {goalIsLocked && (
          <p id={`${formId}-goal-hint`} className="field__hint">
            Dla dzieci i młodzieży dostępny jest tylko cel „utrzymać wagę”.
          </p>
        )}
      </div>

      <NumberField
        id={`${formId}-snacks`}
        name="snackKcal"
        label="Przekąski (kcal dziennie)"
        hint="Tyle kalorii zostawiasz na przekąski i słodycze. Porcje posiłków będą o tyle mniejsze."
        inputMode="numeric"
        step={1}
        min={MEMBER_LIMITS.snackKcal.min}
        max={MEMBER_LIMITS.snackKcal.max}
        value={values.snackKcal}
        onChange={(value) => setField('snackKcal', value)}
        error={errorMessage('snackKcal')}
      />

      <div className="member-form__actions">
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
  name: MemberField;
  label: string;
  inputMode: 'numeric' | 'decimal';
  step: number | 'any';
  min: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

function NumberField({
  id,
  name,
  label,
  inputMode,
  step,
  min,
  max,
  value,
  onChange,
  error,
  hint,
}: NumberFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        className="input"
        type="number"
        inputMode={inputMode}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
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

function toFormValues(member: NewMember): FormValues {
  return {
    name: member.name,
    sex: member.sex,
    age: String(member.age),
    heightCm: String(member.heightCm),
    weightKg: String(member.weightKg),
    activity: member.activity,
    goal: member.goal,
    snackKcal: String(member.snackKcal),
  };
}

/** Empty input is NaN rather than 0, so "nothing typed" is not mistaken for a value. */
function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}
