import { useState } from 'react';
import { formatFullDate } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import type { MeasurementKind, SeriesPoint } from '../../domain/progress/measurement';
import { formatValue } from './labels';

interface ReadingListProps {
  kind: MeasurementKind;
  /** Oldest first. */
  points: readonly SeriesPoint[];
  onDelete: (date: DateKey) => void;
}

/** Every reading of one kind, the newest on top. */
export function ReadingList({ kind, points, onDelete }: ReadingListProps) {
  const [confirming, setConfirming] = useState<DateKey | null>(null);

  return (
    <ul className="reading-list" aria-label="Zapisane pomiary">
      {[...points].reverse().map((point) => (
        <li key={point.date} className="reading-list__item">
          <span className="reading-list__date">{formatFullDate(point.date)}</span>
          <strong>{formatValue(point.value, kind)}</strong>

          {confirming === point.date ? (
            <span
              className="reading-list__actions"
              role="group"
              aria-label={`Usuwanie pomiaru: ${formatFullDate(point.date)}`}
            >
              <button
                type="button"
                className="btn btn--small btn--danger"
                onClick={() => {
                  setConfirming(null);
                  onDelete(point.date);
                }}
              >
                Tak, usuń
              </button>
              <button type="button" className="btn btn--small" onClick={() => setConfirming(null)}>
                Anuluj
              </button>
            </span>
          ) : (
            <span className="reading-list__actions">
              <button
                type="button"
                className="btn btn--small"
                aria-label={`Usuń pomiar: ${formatFullDate(point.date)}`}
                onClick={() => setConfirming(point.date)}
              >
                Usuń
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
