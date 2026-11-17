// A small single-series weekly column chart, rendered on the server as SVG. Each chart has its own
// y-scale; the Trends page shows them as small multiples rather than sharing one axis.

export interface WeeklyPoint {
  weekStart: string
  value: number | null
  partial: boolean
}

const WIDTH = 320
const HEIGHT = 132
const PLOT_TOP = 18
const PLOT_BOTTOM = 108
const PLOT_LEFT = 4
const PLOT_RIGHT = WIDTH - 4
const MAX_BAR = 22
const CORNER = 4

export function formatWeek(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

// A column with a rounded top and a square base.
function columnPath(x: number, width: number, top: number, bottom: number): string {
  const r = Math.min(CORNER, width / 2, bottom - top)
  return [
    `M${x},${bottom}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${bottom}`,
    'Z',
  ].join(' ')
}

export default function WeeklyColumnChart({
  title,
  description,
  points,
  format,
  maxValue,
}: {
  title: string
  description: string
  points: WeeklyPoint[]
  format: (value: number) => string
  // A fixed top for bounded measures (100% or a 5-point rating); otherwise the largest value.
  maxValue?: number
}) {
  const largest = Math.max(0, ...points.map(point => point.value ?? 0))
  const top = maxValue ?? (largest > 0 ? largest : 1)
  const slot = (PLOT_RIGHT - PLOT_LEFT) / Math.max(points.length, 1)
  const barWidth = Math.min(MAX_BAR, slot * 0.62)
  const y = (value: number) => PLOT_BOTTOM - (value / top) * (PLOT_BOTTOM - PLOT_TOP)
  // Label the most recent complete week, matching the headline tiles; the current week is partial.
  const latest = [...points].reverse().find(point => point.value !== null && !point.partial)
  const empty = points.every(point => !point.value)
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])

  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="mb-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}, by week: ${points.map(point =>
          `${formatWeek(point.weekStart)} ${point.value === null ? 'no data' : format(point.value)}`).join('; ')}`}
      >
        {empty ? (
          <text x={WIDTH / 2} y={(PLOT_TOP + PLOT_BOTTOM) / 2} textAnchor="middle" fontSize={11} className="fill-slate-400">
            No activity in this period
          </text>
        ) : (
          <text x={PLOT_LEFT} y={10} className="fill-slate-400" fontSize={10}>{format(top)}</text>
        )}
        <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={PLOT_TOP} y2={PLOT_TOP} className="stroke-slate-100" strokeWidth={1} />
        <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={PLOT_BOTTOM} y2={PLOT_BOTTOM} className="stroke-slate-300" strokeWidth={1} />
        {points.map((point, index) => {
          const slotX = PLOT_LEFT + index * slot
          const barX = slotX + (slot - barWidth) / 2
          const valueLabel = point.value === null ? 'No data' : format(point.value)
          const isLatest = point === latest
          return (
            <g key={point.weekStart}>
              <title>{`Week of ${formatWeek(point.weekStart)}${point.partial ? ' (so far)' : ''}: ${valueLabel}`}</title>
              {/* Full-height hit target so hovering anywhere in the week's slot shows the tooltip. */}
              <rect x={slotX} y={PLOT_TOP - 14} width={slot} height={PLOT_BOTTOM - PLOT_TOP + 14} fill="transparent" />
              {point.value !== null && point.value > 0 && (
                <path
                  d={columnPath(barX, barWidth, y(Math.min(point.value, top)), PLOT_BOTTOM)}
                  fill="#2a78d6"
                  fillOpacity={point.partial ? 0.4 : 1}
                />
              )}
              {isLatest && !empty && point.value !== null && (
                <text
                  x={barX + barWidth / 2}
                  y={y(Math.min(point.value, top)) - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  className="fill-slate-700"
                >
                  {format(point.value)}
                </text>
              )}
              {labelIndexes.has(index) && (
                <text
                  x={slotX + slot / 2}
                  y={PLOT_BOTTOM + 14}
                  textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                  dx={index === 0 ? -(slot / 2 - barWidth / 2) : index === points.length - 1 ? slot / 2 - barWidth / 2 : 0}
                  fontSize={10}
                  className="fill-slate-500"
                >
                  {point.partial ? 'This week' : formatWeek(point.weekStart)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
