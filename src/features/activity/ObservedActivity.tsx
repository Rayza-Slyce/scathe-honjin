import { useState } from 'react'
import type {
  SharedActivityCell,
  SharedActivitySummary,
} from '../../api/honjin-intel/activity'
import './activity.css'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

function formatUtcTimestamp(value: number | null): string {
  if (value === null) return 'None observed yet'

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000)) + ' TCT'
}

function formatUtcDate(value: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value * 1000))
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`
}

function intensity(cell: SharedActivityCell): 'sparse' | 'none' | 'low' | 'medium' | 'high' {
  if (cell.sparse) return 'sparse'
  if (cell.knownCount === 0 || cell.activeCount === 0) return 'none'

  const ratio = cell.activeCount / cell.knownCount
  if (ratio >= 0.75) return 'high'
  if (ratio >= 0.5) return 'medium'
  return 'low'
}

function cellEvidence(dayIndex: number, hour: number, cell: SharedActivityCell): string {
  const unknownCount = cell.totalCount - cell.knownCount
  return `${DAY_NAMES[dayIndex]} ${hourLabel(hour)} TCT · Active ${cell.activeCount} / ${cell.knownCount} known observations · ${unknownCount} unknown observations excluded`
}

export interface ObservedActivityProps {
  summary: SharedActivitySummary
}

export default function ObservedActivity({ summary }: ObservedActivityProps) {
  const [selectedCell, setSelectedCell] = useState<{
    dayIndex: number
    hour: number
  } | null>(null)

  const hasUsableCell = summary.cells.some((day) =>
    day.some((cell) => !cell.sparse && cell.knownCount > 0),
  )
  const selected = selectedCell === null
    ? null
    : summary.cells[selectedCell.dayIndex]?.[selectedCell.hour] ?? null

  return (
    <section className="observed-activity" aria-labelledby="observed-activity-heading">
      <div className="observed-activity__heading">
        <div>
          <p className="section-kicker">TARGET HISTORY</p>
          <h3 id="observed-activity-heading">OBSERVED ACTIVITY</h3>
        </div>
        <span>TCT / UTC</span>
      </div>

      <p className="observed-activity__helper">
        Active = Torn Online or Idle when HONJIN observed the target. Unknown samples are excluded. Coverage may be partial while the 28-day window fills.
      </p>

      {!hasUsableCell && (
        <p className="observed-activity__sparse-state">
          NOT ENOUGH ACTIVITY DATA YET
        </p>
      )}

      <dl className="observed-activity__coverage">
        <div>
          <dt>28-day source window</dt>
          <dd>{formatUtcDate(summary.windowStart)} – {formatUtcDate(summary.windowEnd)}</dd>
        </div>
        <div>
          <dt>Known samples</dt>
          <dd>{summary.knownSampleCount.toLocaleString('en-GB')}</dd>
        </div>
        <div>
          <dt>Covered hours</dt>
          <dd>{summary.coveredHourCount}</dd>
        </div>
        <div>
          <dt>Last observed active</dt>
          <dd>{formatUtcTimestamp(summary.lastActiveObservedAt)}</dd>
        </div>
      </dl>

      <div className="activity-grid" aria-label="Observed activity by weekday and Torn City Time hour">
        <div className="activity-grid__corner" aria-hidden="true" />
        <div className="activity-grid__hours" aria-hidden="true">
          {[0, 6, 12, 18].map((hour) => (
            <span key={hour} style={{ gridColumn: hour + 1 }}>{String(hour).padStart(2, '0')}</span>
          ))}
        </div>

        {summary.cells.map((day, dayIndex) => (
          <div className="activity-grid__row" key={DAY_LABELS[dayIndex]}>
            <span className="activity-grid__day">{DAY_LABELS[dayIndex]}</span>
            <div className="activity-grid__cells">
              {day.map((cell, hour) => {
                const level = intensity(cell)
                const label = cellEvidence(dayIndex, hour, cell)

                return cell.totalCount > 0 ? (
                  <button
                    key={hour}
                    type="button"
                    className={`activity-cell activity-cell--${level}`}
                    aria-label={label}
                    aria-pressed={selectedCell?.dayIndex === dayIndex && selectedCell.hour === hour}
                    title={label}
                    onClick={() => setSelectedCell({ dayIndex, hour })}
                  />
                ) : (
                  <span
                    key={hour}
                    className="activity-cell activity-cell--empty"
                    aria-hidden="true"
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="activity-legend" aria-label="Observed activity legend">
        <span><i className="activity-cell activity-cell--sparse" />Sparse</span>
        <span><i className="activity-cell activity-cell--none" />Inactive</span>
        <span><i className="activity-cell activity-cell--low" />Low</span>
        <span><i className="activity-cell activity-cell--medium" />Mid</span>
        <span><i className="activity-cell activity-cell--high" />High</span>
      </div>

      {selectedCell !== null && selected !== null && (
        <div className="activity-cell-detail" role="status">
          <strong>{DAY_NAMES[selectedCell.dayIndex]} {hourLabel(selectedCell.hour)} TCT</strong>
          <span>Active {selected.activeCount} / {selected.knownCount} known observations</span>
          <small>{selected.totalCount - selected.knownCount} unknown observations excluded</small>
        </div>
      )}

      {summary.peakWindows.length > 0 && (
        <div className="activity-peaks">
          <h4>Most observed activity</h4>
          <ul>
            {summary.peakWindows.map((window) => (
              <li key={`${window.dayIndex}-${window.hour}`}>
                <span>{DAY_NAMES[window.dayIndex]} {hourLabel(window.hour)} TCT</span>
                <strong>{window.activeCount} / {window.knownCount} active</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
