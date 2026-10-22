import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/navigation';
import { HealthDisclaimer } from '../../components/HealthDisclaimer';
import { removeMeasurement, saveMeasurement } from '../../data/measurementRepository';
import { requestPersistentStorage } from '../../data/persistence';
import { formatFullDate } from '../../domain/plan/dates';
import type { DateKey } from '../../domain/plan/dates';
import { MEASUREMENT_KINDS, seriesOf } from '../../domain/progress/measurement';
import type { Measurement, MeasurementKind, SeriesPoint } from '../../domain/progress/measurement';
import { useMeasurements } from '../../hooks/useMeasurements';
import { useMembers } from '../../hooks/useMembers';
import { MeasurementForm } from './MeasurementForm';
import { ProgressChart } from './ProgressChart';
import { ProgressSummary } from './ProgressSummary';
import { ReadingList } from './ReadingList';
import { KIND_LABELS, formatValue } from './labels';
import './MeasurementsPage.css';

/** The smallest range a chart covers, in the unit of the measurement. */
const CHART_MIN_SPAN = 2;

export function MeasurementsPage() {
  const { memberId = '' } = useParams();
  const members = useMembers();
  const measurements = useMeasurements(memberId);
  const [kind, setKind] = useState<MeasurementKind>('weight');
  const [failed, setFailed] = useState(false);

  if (members === undefined || measurements === undefined) return <p>Wczytywanie…</p>;

  const member = members.find((candidate) => candidate.id === memberId);
  if (!member) {
    return (
      <section>
        <h1>Nie znaleziono domownika</h1>
        <p>
          Być może został usunięty. <Link to={ROUTES.household}>Wróć do domowników</Link>.
        </p>
      </section>
    );
  }

  const points = seriesOf(measurements, kind);
  const takenDates = new Set(points.map((point) => point.date));
  const { name } = KIND_LABELS[kind];
  const losesOrGains = member.goal !== 'maintain';
  const target = kind === 'weight' && losesOrGains ? member.targetWeightKg : undefined;

  /** Runs a storage write and reports whether it worked. */
  async function attempt(write: () => Promise<unknown>): Promise<boolean> {
    setFailed(false);
    try {
      await write();
      return true;
    } catch (error) {
      console.error('Could not save a measurement', error);
      setFailed(true);
      return false;
    }
  }

  async function handleSave(measurement: Measurement): Promise<boolean> {
    const stored = await attempt(() => saveMeasurement(measurement));
    // Ask only once the user has something worth keeping.
    if (stored) void requestPersistentStorage();
    return stored;
  }

  function handleDelete(date: DateKey) {
    void attempt(() => removeMeasurement({ memberId, kind, date }));
  }

  return (
    <section className="measurements">
      <p>
        <Link to={ROUTES.household}>← Domownicy</Link>
      </p>
      <h1>Pomiary: {member.name}</h1>
      <p className="lead">
        Zapisuj pomiary, kiedy chcesz, na przykład raz w tygodniu. Wszystko zostaje tylko na tym
        urządzeniu.
      </p>

      {failed && (
        <p className="form-error" role="alert">
          Nie udało się zapisać zmian. Spróbuj ponownie.
        </p>
      )}

      <fieldset className="field">
        <legend className="field__label">Co mierzysz?</legend>
        <div className="choice-group">
          {MEASUREMENT_KINDS.map((option) => (
            <label key={option} className="choice">
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
              />
              {KIND_LABELS[option].name}
            </label>
          ))}
        </div>
      </fieldset>

      <h2>Nowy pomiar</h2>
      <MeasurementForm
        key={kind}
        memberId={member.id}
        kind={kind}
        takenDates={takenDates}
        onSave={handleSave}
      />
      {kind === 'weight' && (
        <p className="field__hint">
          Najnowsza waga trafia też do danych domownika, więc jego dzienne zapotrzebowanie liczy się
          od aktualnej wagi.
        </p>
      )}
      {kind === 'weight' && losesOrGains && member.targetWeightKg === undefined && (
        <p className="field__hint">
          Żeby zobaczyć postęp do celu i prognozę, wpisz docelową wagę w danych domownika.
        </p>
      )}

      {points.length === 0 ? (
        <p className="measurements__empty">
          Nie ma tu jeszcze żadnego pomiaru: {name.toLowerCase()}. Zacznij od pierwszego.
        </p>
      ) : (
        <>
          <h2>Postępy</h2>
          <ProgressSummary kind={kind} points={points} target={target} />
          {points.length > 1 && (
            <ProgressChart
              points={points}
              unit={KIND_LABELS[kind].unit}
              target={target}
              minSpan={CHART_MIN_SPAN}
              description={describeChart(kind, points, target)}
            />
          )}

          <h2>Zapisane pomiary</h2>
          <ReadingList kind={kind} points={points} onDelete={handleDelete} />
        </>
      )}

      {kind === 'weight' && <HealthDisclaimer />}
    </section>
  );
}

/** What the chart shows, in words, for people who cannot see it. */
function describeChart(
  kind: MeasurementKind,
  points: readonly SeriesPoint[],
  target: number | undefined,
): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return '';

  const parts = [
    `Wykres: ${KIND_LABELS[kind].name.toLowerCase()}.`,
    `Pierwszy pomiar ${formatValue(first.value, kind)} (${formatFullDate(first.date)}),`,
    `ostatni ${formatValue(last.value, kind)} (${formatFullDate(last.date)}).`,
    target !== undefined && `Cel: ${formatValue(target, kind)}.`,
  ];
  return parts.filter(Boolean).join(' ');
}
