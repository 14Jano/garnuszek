import { useId } from 'react';
import type { Member } from '../../domain/household/member';
import { MEMBER_LIMITS } from '../../domain/household/member';
import type { DateKey } from '../../domain/plan/dates';
import type { SnackAllowance, SnackOverride } from '../../domain/plan/snacks';
import './SnackSection.css';

interface SnackSectionProps {
  date: DateKey;
  household: readonly Member[];
  snacks: SnackAllowance;
  /** The amounts that were set for this day only. */
  overrides: readonly SnackOverride[];
  /** `null` goes back to the person's usual snack amount. */
  onChange: (memberId: string, kcal: number | null) => void;
}

/** Lets the user change, for one day, how many calories each person keeps for snacks. */
export function SnackSection({ date, household, snacks, overrides, onChange }: SnackSectionProps) {
  const headingId = useId();

  return (
    <section className="snack-section" aria-labelledby={headingId}>
      <h3 id={headingId}>Przekąski na ten dzień</h3>
      <p className="snack-section__hint">
        Zmień, ile kalorii zostawiasz na przekąski. Porcje posiłków dopasują się same.
      </p>

      <ul className="snack-section__list">
        {household.map((member) => (
          <SnackRow
            key={member.id}
            member={member}
            current={snacks(date, member)}
            overridden={overrides.some((override) => override.memberId === member.id)}
            onChange={(kcal) => onChange(member.id, kcal)}
          />
        ))}
      </ul>
    </section>
  );
}

interface SnackRowProps {
  member: Member;
  current: number;
  overridden: boolean;
  onChange: (kcal: number | null) => void;
}

function SnackRow({ member, current, overridden, onChange }: SnackRowProps) {
  const inputId = useId();

  function commit(text: string, field: HTMLInputElement) {
    const kcal = text.trim() === '' ? Number.NaN : Number(text);
    const valid =
      Number.isInteger(kcal) &&
      kcal >= MEMBER_LIMITS.snackKcal.min &&
      kcal <= MEMBER_LIMITS.snackKcal.max;

    if (!valid) {
      // Not a usable amount: show the saved one again.
      field.value = String(current);
      return;
    }
    if (kcal === current) return;

    // An amount equal to the usual one needs no entry of its own.
    onChange(kcal === member.snackKcal ? null : kcal);
  }

  return (
    <li className="snack-row">
      <label htmlFor={inputId}>{member.name}</label>
      <input
        id={inputId}
        // A new key re-creates the field, so it shows the saved amount after a reset.
        key={current}
        className="input snack-row__input"
        type="number"
        inputMode="numeric"
        min={MEMBER_LIMITS.snackKcal.min}
        max={MEMBER_LIMITS.snackKcal.max}
        step={1}
        defaultValue={current}
        onBlur={(event) => commit(event.currentTarget.value, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <span className="snack-row__unit">kcal</span>
      {overridden && (
        <button
          type="button"
          className="btn btn--small"
          aria-label={`Przywróć domyślne przekąski: ${member.name}`}
          onClick={() => onChange(null)}
        >
          Przywróć domyślne ({member.snackKcal} kcal)
        </button>
      )}
    </li>
  );
}
