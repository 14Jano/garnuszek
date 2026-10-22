import { useRef, useState } from 'react';
import { formatFullDate } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import type { MeasurementKind, SeriesPoint } from '../../domain/progress/measurement';
import { useConfirmFocus } from '../../hooks/useConfirmFocus';
import { formatValue } from './labels';

interface ReadingListProps {
  kind: MeasurementKind;
  /** Oldest first. */
  points: readonly SeriesPoint[];
  onDelete: (date: DateKey) => void;
}

/** Every reading of one kind, the newest on top. */
export function ReadingList({ kind, points, onDelete }: ReadingListProps) {
  const list = useRef<HTMLUListElement>(null);

  function handleDelete(date: DateKey) {
    // The row is about to go away, and with it the button that had focus.
    list.current?.focus();
    onDelete(date);
  }

  return (
    <ul className="reading-list" aria-label="Zapisane pomiary" ref={list} tabIndex={-1}>
      {[...points].reverse().map((point) => (
        <ReadingRow key={point.date} kind={kind} point={point} onDelete={handleDelete} />
      ))}
    </ul>
  );
}

interface ReadingRowProps {
  kind: MeasurementKind;
  point: SeriesPoint;
  onDelete: (date: DateKey) => void;
}

function ReadingRow({ kind, point, onDelete }: ReadingRowProps) {
  const [confirming, setConfirming] = useState(false);
  const { trigger, cancel } = useConfirmFocus(confirming);
  const date = formatFullDate(point.date);

  return (
    <li className="reading-list__item">
      <span className="reading-list__date">{date}</span>
      <strong>{formatValue(point.value, kind)}</strong>

      {confirming ? (
        <span
          className="reading-list__actions"
          role="group"
          aria-label={`Usuwanie pomiaru: ${date}`}
        >
          <button
            type="button"
            className="btn btn--small btn--danger"
            onClick={() => onDelete(point.date)}
          >
            Tak, usuń
          </button>
          <button
            type="button"
            className="btn btn--small"
            ref={cancel}
            onClick={() => setConfirming(false)}
          >
            Anuluj
          </button>
        </span>
      ) : (
        <span className="reading-list__actions">
          <button
            type="button"
            className="btn btn--small"
            ref={trigger}
            aria-label={`Usuń pomiar: ${date}`}
            onClick={() => setConfirming(true)}
          >
            Usuń
          </button>
        </span>
      )}
    </li>
  );
}
