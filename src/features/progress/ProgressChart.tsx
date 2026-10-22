import { formatFullDate, formatShortDate } from '../../domain/plan/dates';
import type { SeriesPoint } from '../../domain/progress/measurement';
import { formatDecimal } from '../../format/numbers';
import { timeFraction, valueAxis } from './chart';
import './ProgressChart.css';

// The picture is drawn about as wide as a phone screen, so its text stays readable there.
const WIDTH = 360;
const HEIGHT = 240;
const MARGIN = { top: 28, right: 12, bottom: 32, left: 48 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

/** With this many readings or more, dots would only crowd the line, so just the last one is drawn. */
const MAX_DOTS = 60;

interface ProgressChartProps {
  /** At least two readings, oldest first. */
  points: readonly SeriesPoint[];
  unit: string;
  /** Drawn as a dashed line when given. */
  target?: number;
  /** What a screen reader says instead of the picture. */
  description: string;
  /** The smallest range of values the axis covers, so tiny changes do not look dramatic. */
  minSpan: number;
}

export function ProgressChart({ points, unit, target, description, minSpan }: ProgressChartProps) {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const values = points.map((point) => point.value);
  const axis = valueAxis(target === undefined ? values : [...values, target], minSpan);

  const x = (date: string) => MARGIN.left + timeFraction(date, first.date, last.date) * PLOT_WIDTH;
  const y = (value: number) =>
    MARGIN.top + ((axis.max - value) / (axis.max - axis.min)) * PLOT_HEIGHT;

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.date)} ${y(point.value)}`)
    .join(' ');
  const dots = points.length < MAX_DOTS ? points : [last];
  const sameYear = first.date.slice(0, 4) === last.date.slice(0, 4);
  const formatDate = sameYear ? formatShortDate : formatFullDate;

  return (
    <div className="progress-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={description}>
        {axis.ticks.map((tick) => (
          <g key={tick}>
            <line
              className="progress-chart__grid"
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="progress-chart__label"
              x={MARGIN.left - 8}
              y={y(tick)}
              textAnchor="end"
              dy="0.32em"
            >
              {formatDecimal(tick)}
            </text>
          </g>
        ))}

        <text
          className="progress-chart__label"
          x={MARGIN.left - 8}
          y={MARGIN.top - 16}
          textAnchor="end"
        >
          {unit}
        </text>
        <text className="progress-chart__label" x={MARGIN.left} y={HEIGHT - 12} textAnchor="start">
          {formatDate(first.date)}
        </text>
        <text
          className="progress-chart__label"
          x={WIDTH - MARGIN.right}
          y={HEIGHT - 12}
          textAnchor="end"
        >
          {formatDate(last.date)}
        </text>

        {target !== undefined && (
          <g>
            <line
              className="progress-chart__target"
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(target)}
              y2={y(target)}
            />
            <text
              className="progress-chart__target-label"
              x={WIDTH - MARGIN.right}
              y={y(target) - 6}
              textAnchor="end"
            >
              Cel: {formatDecimal(target)} {unit}
            </text>
          </g>
        )}

        <path className="progress-chart__line" d={line} />
        {dots.map((point) => (
          <circle
            key={point.date}
            className={
              point === last
                ? 'progress-chart__dot progress-chart__dot--latest'
                : 'progress-chart__dot'
            }
            cx={x(point.date)}
            cy={y(point.value)}
            r={point === last ? 5 : 3.5}
          />
        ))}
      </svg>
    </div>
  );
}
