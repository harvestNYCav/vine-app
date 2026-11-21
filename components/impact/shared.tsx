import Link from 'next/link'
import type { PeriodMetrics, ProgramImpact, WeeklyMetrics } from '@/lib/admin-metrics'
import WeeklyColumnChart, { formatWeek } from './WeeklyColumnChart'
import type { DrillTile } from './DrillTiles'
import { count, percent } from './format'

// Pieces shared by the admin Impact page (/admin/metrics) and the tutor view (/tutor/impact).
// Session links take a `basePath` so each role stays on its own page.

export interface TrendMetric {
  key: keyof PeriodMetrics
  title: string
  description: string
  format: (value: number) => string
  maxValue?: number
}

export const ACTIVE: TrendMetric = { key: 'activeStudents', title: 'Active students', description: 'Did any practice in Vine', format: count }
export const HOME: TrendMetric = { key: 'homePracticeStudents', title: 'Practiced at home', description: 'Used Vine on a day with no session', format: count }
export const ATTENDANCE: TrendMetric = { key: 'attendanceRate', title: 'Attendance rate', description: 'Present ÷ students marked', format: percent, maxValue: 1 }
export const TAUGHT: TrendMetric = { key: 'lessonsTaught', title: 'Lessons taught', description: 'Scheduled lessons, student not absent', format: count }

export const LEARNING: TrendMetric[] = [
  { key: 'quizAverage', title: 'Lesson quiz average', description: 'ESL and ELA lesson quizzes', format: percent, maxValue: 1 },
  { key: 'homeworkCompletionRate', title: 'Homework completed', description: 'Assigned homework finished; recent weeks fill in as students catch up', format: percent, maxValue: 1 },
  HOME,
  { key: 'examAverageScore', title: 'Exam practice score', description: 'Grade 3–8 and Regents sections', format: percent, maxValue: 1 },
]

export const TUTORING: TrendMetric[] = [
  { key: 'deckUseRate', title: 'Taught with the slides', description: 'Lessons where the slide deck was opened', format: percent, maxValue: 1 },
  { key: 'wrapUpRate', title: 'Wrap-up filed', description: 'Lessons with a tutor debrief', format: percent, maxValue: 1 },
  { key: 'handoffRate', title: 'Hand-off left', description: 'Lessons with a note for the next tutor', format: percent, maxValue: 1 },
  { key: 'homeworkAssignedRate', title: 'Homework assigned', description: 'Lessons where the tutor gave homework', format: percent, maxValue: 1 },
]

export const TABLE_METRICS = [ACTIVE, HOME, ATTENDANCE, TAUGHT, ...LEARNING.filter(m => m !== HOME), ...TUTORING]

export const sessionHref = (basePath: string, session: string) => `${basePath}?session=${session}`

export function value(source: PeriodMetrics | undefined, key: keyof PeriodMetrics): number | null {
  const raw = source?.[key]
  return typeof raw === 'number' ? raw : null
}

// The change from the session week before, for a tile's note.
export function deltaNote(metric: TrendMetric, current: PeriodMetrics, previous: WeeklyMetrics | undefined): Pick<DrillTile, 'note' | 'noteTone'> {
  const now = value(current, metric.key)
  const before = value(previous, metric.key)
  if (!previous) return { note: 'First session of the term', noteTone: 'muted' }
  if (now === null || before === null) return { note: `No data for ${formatWeek(previous.sessionDate)}`, noteTone: 'muted' }
  const delta = now - before
  const vs = `vs ${formatWeek(previous.sessionDate)}`
  if (delta === 0) return { note: `Same as ${formatWeek(previous.sessionDate)}`, noteTone: 'muted' }
  const amount = metric.format === percent
    // A change in a rate is in percentage points, not a percent of the old rate.
    ? `${Math.round(Math.abs(delta) * 100)} ${Math.round(Math.abs(delta) * 100) === 1 ? 'pt' : 'pts'}`
    : metric.format(Math.abs(delta))
  return { note: `${delta > 0 ? '▲' : '▼'} ${amount} ${vs} (${metric.format(before)})`, noteTone: delta > 0 ? 'up' : 'down' }
}

export function Charts({ metrics, weeks, selected, anchor, basePath, columns }: {
  metrics: TrendMetric[]
  weeks: WeeklyMetrics[]
  selected: string | null
  anchor: string
  basePath: string
  // Grid classes; by default two columns, then three or four on wide screens.
  columns?: string
}) {
  const grid = columns ?? `sm:grid-cols-2 ${metrics.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`
  return (
    <div className={`mb-4 grid gap-3 ${grid}`}>
      {metrics.map(metric => (
        <WeeklyColumnChart
          key={metric.key}
          title={metric.title}
          description={metric.description}
          format={metric.format}
          maxValue={metric.maxValue}
          selected={selected}
          points={weeks.map(week => ({
            weekStart: week.weekStart,
            sessionDate: week.sessionDate,
            partial: week.partial,
            value: value(week, metric.key),
            href: `${sessionHref(basePath, week.sessionDate)}#${anchor}`,
          }))}
        />
      ))}
    </div>
  )
}

export function Section({ id, question, intro, children }: { id: string; question: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-36">
      <h2 className="text-xl font-bold text-slate-900">{question}</h2>
      <p className="mb-4 max-w-3xl text-sm text-slate-500">{intro}</p>
      {children}
    </section>
  )
}

export function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {note && <p className="mb-3 text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

export function SessionPicker({ impact, basePath }: { impact: ProgramImpact; basePath: string }) {
  const { weeks, focus, upcomingSessions, today } = impact
  const chip = 'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold'
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-white p-1" aria-label="Vine session">
      <Link
        href={sessionHref(basePath, 'all')}
        aria-current={focus === null ? 'page' : undefined}
        className={`${chip} ${focus === null ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        All sessions
      </Link>
      <span className="mx-1 my-1 w-px bg-slate-200" aria-hidden />
      {weeks.map(week => {
        const selected = focus?.weekStart === week.weekStart
        return (
          <Link
            key={week.weekStart}
            href={sessionHref(basePath, week.sessionDate)}
            aria-current={selected ? 'page' : undefined}
            className={`${chip} ${selected ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {formatWeek(week.sessionDate)}
            {week.sessionDate > today && <span className="ml-1 text-xs font-normal opacity-75">upcoming</span>}
          </Link>
        )
      })}
      {upcomingSessions.map(date => (
        <span key={date} className={`${chip} cursor-default font-normal text-slate-300`} title="Upcoming session">
          {formatWeek(date)}
        </span>
      ))}
    </nav>
  )
}
