// A small single-series column chart with one column per Vine session week, rendered on the server
// as SVG. Each chart has its own y-scale; the Impact page shows them as small multiples. Each column
// links to that session, and the session in focus is drawn solid with its value labelled.

export interface WeeklyPoint {
  weekStart: string
  sessionDate: string
  value: number | null
  partial: boolean
  href: string
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
  selected,
}: {
  title: string
  description: string
  points: WeeklyPoint[]
  format: (value: number) => string
  // A fixed top for bounded measures (100% or a 5-point rating); otherwise the largest value.
  maxValue?: number
  // The week in focus, or null when looking at every session.
  selected: string | null
}) {
  const largest = Math.max(0, ...points.map(point => point.value ?? 0))
  const top = maxValue ?? (largest > 0 ? largest : 1)
  const slot = (PLOT_RIGHT - PLOT_LEFT) / Math.max(points.length, 1)
  const barWidth = Math.min(MAX_BAR, slot * 0.62)
  const y = (value: number) => PLOT_BOTTOM - (value / top) * (PLOT_BOTTOM - PLOT_TOP)
  // Label the week in focus; with no focus, the most recent complete week.
  const labelled = selected
    ? points.find(point => point.weekStart === selected)
    : [...points].reverse().find(point => point.value !== null && !point.partial)
  const empty = points.every(point => !point.value)
  // Every date fits up to 8 columns; past that, label every other one.
  const labelEvery = Math.ceil(points.length / 8)

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
          const isLabelled = point === labelled
          const dimmed = selected !== null && point.weekStart !== selected
          return (
            <a key={point.weekStart} href={point.href} aria-label={`${formatWeek(point.sessionDate)} session: ${valueLabel}`}>
              <title>{`${formatWeek(point.sessionDate)} session${point.partial ? ' (so far)' : ''}: ${valueLabel}. Click to focus on it.`}</title>
              {/* Full-height hit target so hovering anywhere in the week's slot shows the tooltip. */}
              <rect
                x={slotX} y={PLOT_TOP - 14} width={slot} height={PLOT_BOTTOM - PLOT_TOP + 28}
                className={point.weekStart === selected ? 'fill-slate-100' : 'fill-transparent hover:fill-slate-50'}
              />
              {point.value !== null && point.value > 0 && (
                <path
                  d={columnPath(barX, barWidth, y(Math.min(point.value, top)), PLOT_BOTTOM)}
                  fill="#2a78d6"
                  fillOpacity={dimmed ? 0.35 : point.partial ? 0.5 : 1}
                />
              )}
              {isLabelled && !empty && point.value !== null && (
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
              {(index % labelEvery === 0 || index === points.length - 1) && (
                <text
                  x={slotX + slot / 2}
                  y={PLOT_BOTTOM + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={point.weekStart === selected ? 700 : 400}
                  className={point.weekStart === selected ? 'fill-slate-900' : 'fill-slate-500'}
                >
                  {formatWeek(point.sessionDate)}
                </text>
              )}
            </a>
          )
        })}
      </svg>
    </figure>
  )
}
