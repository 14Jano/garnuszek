import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { formatFullDate, isDateKey, todayKey } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import { MEASUREMENT_LIMITS, validateMeasurement } from '../../domain/progress/measurement';
import type {
  Measurement,
  MeasurementErrors,
  MeasurementKind,
} from '../../domain/progress/measurement';
import { KIND_LABELS } from './labels';

interface MeasurementFormProps {
  memberId: string;
  kind: MeasurementKind;
  /** Days that already have a reading of this kind; saving again replaces it. */
  takenDates: ReadonlySet<DateKey>;
  /** Resolves to whether the reading was stored. */
  onSave: (measurement: Measurement) => Promise<boolean>;
}

export function MeasurementForm({ memberId, kind, takenDates, onSave }: MeasurementFormProps) {
  const formId = useId();
  const [date, setDate] = useState<string>(() => todayKey());
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<MeasurementErrors>({});
  const [savedDate, setSavedDate] = useState<DateKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { name, unit } = KIND_LABELS[kind];
  const limits = MEASUREMENT_LIMITS[kind];
  const today = todayKey();
  const replacesReading = isDateKey(date) && takenDates.has(date);

  const errorMessages = {
    date: {
      required: 'Podaj datę pomiaru.',
      invalid: 'Podaj datę z dzisiaj albo z przeszłości.',
    },
    value: {
      required: `Wpisz, ile wynosi ${name.toLowerCase()}.`,
      invalid: `Podaj wartość w ${unit === 'kg' ? 'kilogramach' : 'centymetrach'}, od ${limits.min} do ${limits.max}.`,
    },
  };

  function edit(update: () => void, field: 'date' | 'value') {
    update();
    setSavedDate(null);
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const number = value.trim() === '' ? Number.NaN : Number(value);
    const problems = validateMeasurement({ kind, date, value: number }, today);
    setErrors(problems);

    const firstInvalid = problems.date ? 'date' : problems.value ? 'value' : undefined;
    if (firstInvalid) {
      const control = form.elements.namedItem(firstInvalid);
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setSubmitting(true);
    try {
      const stored = await onSave({ memberId, kind, date, value: number });
      if (stored) {
        setValue('');
        setSavedDate(date);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="measurement-form" onSubmit={handleSubmit} noValidate>
      <div className="measurement-form__fields">
        <div className="field">
          <label className="field__label" htmlFor={`${formId}-date`}>
            Data
          </label>
          <input
            id={`${formId}-date`}
            name="date"
            className="input"
            type="date"
            max={today}
            value={date}
            onChange={(event) => edit(() => setDate(event.target.value), 'date')}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy(formId, 'date', errors.date, replacesReading)}
          />
          {replacesReading && (
            <p id={`${formId}-date-hint`} className="field__hint">
              Z tego dnia masz już ten pomiar. Zapisanie nowego go zastąpi.
            </p>
          )}
          {errors.date && (
            <p id={`${formId}-date-error`} className="field__error">
              {errorMessages.date[errors.date]}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${formId}-value`}>
            {name} ({unit})
          </label>
          <input
            id={`${formId}-value`}
            name="value"
            className="input"
            type="number"
            inputMode="decimal"
            step="any"
            min={limits.min}
            max={limits.max}
            value={value}
            onChange={(event) => edit(() => setValue(event.target.value), 'value')}
            aria-invalid={errors.value ? true : undefined}
            aria-describedby={describedBy(formId, 'value', errors.value)}
          />
          {errors.value && (
            <p id={`${formId}-value-error`} className="field__error">
              {errorMessages.value[errors.value]}
            </p>
          )}
        </div>
      </div>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        Zapisz pomiar
      </button>

      {savedDate && (
        <p className="measurement-form__saved" role="status">
          Zapisano pomiar z {formatFullDate(savedDate)}.
        </p>
      )}
    </form>
  );
}

function describedBy(
  formId: string,
  field: 'date' | 'value',
  problem: string | undefined,
  hasHint = false,
): string | undefined {
  const ids = [hasHint && `${formId}-${field}-hint`, problem && `${formId}-${field}-error`];
  return ids.filter(Boolean).join(' ') || undefined;
}
