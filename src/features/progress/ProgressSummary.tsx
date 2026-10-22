import { formatFullDate } from '../../domain/plan/dates';
import type { MeasurementKind, SeriesPoint } from '../../domain/progress/measurement';
import { forecastTarget, summarizeSeries, targetProgress } from '../../domain/progress/progress';
import { forecastText } from './forecastText';
import { formatDifference, formatValue } from './labels';

interface ProgressSummaryProps {
  kind: MeasurementKind;
  /** Oldest first, at least one. */
  points: readonly SeriesPoint[];
  /** The weight the person wants to reach; only given for weight. */
  target?: number;
}

export function ProgressSummary({ kind, points, target }: ProgressSummaryProps) {
  const summary = summarizeSeries(points);
  if (!summary) return null;

  const { start, latest, change } = summary;
  const hasHistory = points.length > 1;

  return (
    <div className="progress-summary">
      <dl className="progress-summary__figures">
        {hasHistory && (
          <div>
            <dt>Pierwszy pomiar</dt>
            <dd>
              <strong>{formatValue(start.value, kind)}</strong>
              <span>{formatFullDate(start.date)}</span>
            </dd>
          </div>
        )}
        <div>
          <dt>{hasHistory ? 'Ostatni pomiar' : 'Jedyny pomiar'}</dt>
          <dd>
            <strong>{formatValue(latest.value, kind)}</strong>
            <span>{formatFullDate(latest.date)}</span>
          </dd>
        </div>
        {hasHistory && (
          <div>
            <dt>Zmiana</dt>
            <dd>
              <strong>{formatDifference(change, kind)}</strong>
            </dd>
          </div>
        )}
      </dl>

      {!hasHistory && (
        <p className="progress-summary__note">Dodaj kolejny pomiar, a pokażemy zmianę i wykres.</p>
      )}

      {target !== undefined && <TargetSection points={points} target={target} />}
    </div>
  );
}

function TargetSection({ points, target }: { points: readonly SeriesPoint[]; target: number }) {
  const summary = summarizeSeries(points);
  if (!summary) return null;

  const progress = targetProgress(summary.start.value, summary.latest.value, target);
  const total = progress.achieved + progress.remaining;

  return (
    <div className="progress-summary__target">
      <p>
        <strong>Cel: {formatValue(target, 'weight')}</strong>
        {!progress.reached && <> Do celu zostało {formatValue(progress.remaining, 'weight')}.</>}
      </p>
      {!progress.reached && total > 0 && (
        <progress
          className="progress-summary__bar"
          aria-label="Postęp do celu"
          value={progress.achieved}
          max={total}
        />
      )}
      <p>{forecastText(forecastTarget(points, target))}</p>
    </div>
  );
}
