import Link from 'next/link'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import {
  getProgramImpact,
  parseTrendWeeks,
  QUIET_AFTER_DAYS,
  SESSION_MINUTES,
  TREND_WEEK_OPTIONS,
  type PeriodMetrics,
  type WeeklyMetrics,
} from '@/lib/admin-metrics'
import WeeklyColumnChart, { formatWeek } from './WeeklyColumnChart'
import StudentProgressTable from './StudentProgressTable'
import TutorUsageTable from './TutorUsageTable'
import LessonFitTable, { lessonFlags } from './LessonFitTable'
import { count, formatDay, maybe, minutes, percent } from './format'

interface TrendMetric {
  key: keyof PeriodMetrics
  title: string
  description: string
  format: (value: number) => string
  maxValue?: number
}

const ACTIVE: TrendMetric = { key: 'activeStudents', title: 'Active students', description: 'Did any practice in Vine', format: count }
const HOME: TrendMetric = { key: 'homePracticeStudents', title: 'Practiced at home', description: 'Used Vine on a day with no session', format: count }
const ATTENDANCE: TrendMetric = { key: 'attendanceRate', title: 'Attendance rate', description: 'Present ÷ students marked', format: percent, maxValue: 1 }
const TAUGHT: TrendMetric = { key: 'lessonsTaught', title: 'Lessons taught', description: 'Scheduled lessons, student not absent', format: count }

const LEARNING: TrendMetric[] = [
  { key: 'quizAverage', title: 'Lesson quiz average', description: 'ESL and ELA lesson quizzes', format: percent, maxValue: 1 },
  { key: 'homeworkCompletionRate', title: 'Homework completed', description: 'Assigned homework finished; recent weeks fill in as students catch up', format: percent, maxValue: 1 },
  HOME,
  { key: 'examAverageScore', title: 'Exam practice score', description: 'Grade 3–8 and Regents sections', format: percent, maxValue: 1 },
]

const TUTORING: TrendMetric[] = [
  { key: 'deckUseRate', title: 'Taught with the slides', description: 'Lessons where the slide deck was opened', format: percent, maxValue: 1 },
  { key: 'wrapUpRate', title: 'Wrap-up filed', description: 'Lessons with a tutor debrief', format: percent, maxValue: 1 },
  { key: 'homeworkAssignedRate', title: 'Homework assigned', description: 'Lessons where the tutor gave homework', format: percent, maxValue: 1 },
]

const TABLE_METRICS = [ACTIVE, HOME, ATTENDANCE, TAUGHT, ...LEARNING.filter(m => m !== HOME), ...TUTORING]

function value(source: PeriodMetrics | undefined, key: keyof PeriodMetrics): number | null {
  const raw = source?.[key]
  return typeof raw === 'number' ? raw : null
}

function Tile({ label, value: shown, note, noteTone = 'muted' }: {
  label: string
  value: string
  note?: string
  noteTone?: 'muted' | 'up' | 'down'
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{shown}</p>
      {note && (
        <p className={`mt-1 text-xs font-medium ${
          noteTone === 'up' ? 'text-green-700' : noteTone === 'down' ? 'text-red-700' : 'text-slate-500'
        }`}>
          {note}
        </p>
      )}
    </div>
  )
}

function WeekTile({ metric, current, previous }: {
  metric: TrendMetric
  current: WeeklyMetrics | undefined
  previous: WeeklyMetrics | undefined
}) {
  const now = value(current, metric.key)
  const before = value(previous, metric.key)
  const delta = now !== null && before !== null ? now - before : null
  const amount = delta === null ? '' : metric.format === percent
    // A change in a rate is in percentage points, not a percent of the old rate.
    ? `${Math.round(Math.abs(delta) * 100)} ${Math.round(Math.abs(delta) * 100) === 1 ? 'pt' : 'pts'}`
    : metric.format(Math.abs(delta))
  return (
    <Tile
      label={metric.title}
      value={maybe(now, metric.format)}
      note={delta === null ? 'No data the week before' : delta === 0 ? 'Same as the week before' : `${delta > 0 ? '▲' : '▼'} ${amount} vs the week before`}
      noteTone={delta === null || delta === 0 ? 'muted' : delta > 0 ? 'up' : 'down'}
    />
  )
}

function Charts({ metrics, weeks }: { metrics: TrendMetric[]; weeks: WeeklyMetrics[] }) {
  return (
    <div className={`mb-4 grid gap-3 sm:grid-cols-2 ${metrics.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
      {metrics.map(metric => (
        <WeeklyColumnChart
          key={metric.key}
          title={metric.title}
          description={metric.description}
          format={metric.format}
          maxValue={metric.maxValue}
          points={weeks.map(week => ({ weekStart: week.weekStart, partial: week.partial, value: value(week, metric.key) }))}
        />
      ))}
    </div>
  )
}

function Section({ id, question, intro, children }: { id: string; question: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-4">
      <h2 className="text-xl font-bold text-slate-900">{question}</h2>
      <p className="mb-4 max-w-3xl text-sm text-slate-500">{intro}</p>
      {children}
    </section>
  )
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {note && <p className="mb-3 text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

export default async function AdminImpactPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>
}) {
  const { weeks: requestedWeeks } = await searchParams
  const weekCount = parseTrendWeeks(requestedWeeks)
  const db = await getDb()
  const impact = await getProgramImpact(db, { today: todayString(), weeks: weekCount })
  const { weeks, period, eslLevels } = impact
  // Week-over-week tiles compare the last full week with the one before; the current week is partial.
  const lastFullWeek = weeks[weeks.length - 2]
  const weekBefore = weeks[weeks.length - 3]
  const periodLabel = `last ${weekCount} weeks`
  const firstDay = weeks[0]?.weekStart ?? ''
  const { trackingSince } = impact
  // Slide and wrap-up tracking were added after launch; say so when the period reaches back before them.
  const trackingNote = [
    trackingSince.deck && trackingSince.deck > firstDay ? `Slide tracking began ${formatDay(trackingSince.deck)}` : null,
    trackingSince.wrapUps && trackingSince.wrapUps > firstDay ? `wrap-ups began ${formatDay(trackingSince.wrapUps)}` : null,
  ].filter(Boolean).join('; ')
  const homeworkAssigned = impact.students.reduce((sum, s) => sum + s.homeworkAssigned, 0)
  const homeworkDone = impact.students.reduce((sum, s) => sum + s.homeworkDone, 0)
  const eslLessons = impact.lessons.filter(lesson => lesson.track === 'esl')
  const elaLessons = impact.lessons.filter(lesson => lesson.track === 'ela')
  const flaggedLessons = impact.lessons.filter(lesson => lessonFlags(lesson).some(flag => flag.tone === 'warn')).length
  const untaughtEsl = eslLessons.filter(lesson => lesson.classesTaught === 0).length
  const wrapUpsFiled = impact.lessons.reduce((sum, lesson) => sum + lesson.wrapUps, 0)
  const lessonsFinished = impact.lessons.reduce((sum, lesson) => sum + (lesson.finishedRate ?? 0) * lesson.wrapUps, 0)
  const deckClasses = impact.lessons.reduce((sum, lesson) => sum + lesson.deckClasses, 0)
  const deckMinutes = impact.lessons.reduce((sum, lesson) => sum + (lesson.averageDeckMinutes ?? 0) * lesson.deckClasses, 0)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Students</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Impact</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Is Vine doing what it was built for? Tutors teach in-person lessons from it, students keep
            practicing between sessions, and students learn.
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-slate-300 bg-white p-1" aria-label="Time range">
          {TREND_WEEK_OPTIONS.map(option => (
            <Link
              key={option}
              href={`/admin/metrics?weeks=${option}`}
              aria-current={option === weekCount ? 'page' : undefined}
              className={`rounded-md px-3 py-1 text-sm font-semibold ${
                option === weekCount ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option} weeks
            </Link>
          ))}
        </nav>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Sections">
        {[
          ['#learning', 'Are students learning?'],
          ['#tutors', 'How are tutors using Vine?'],
          ['#curriculum', 'Does the curriculum fit?'],
          ['#check-in', `Students to check in on (${impact.quietStudents.length})`],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-100">
            {label}
          </a>
        ))}
      </nav>

      {lastFullWeek && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Week of {formatWeek(lastFullWeek.weekStart)} at a glance</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <WeekTile metric={ACTIVE} current={lastFullWeek} previous={weekBefore} />
            <WeekTile metric={HOME} current={lastFullWeek} previous={weekBefore} />
            <WeekTile metric={ATTENDANCE} current={lastFullWeek} previous={weekBefore} />
            <WeekTile metric={TAUGHT} current={lastFullWeek} previous={weekBefore} />
          </div>
        </section>
      )}

      <Section
        id="learning"
        question="Are students learning?"
        intro={`Scores and homework over the ${periodLabel}, and ESL level changes since each student's first placement test. A re-test is the clearest sign of growth; quiz scores and homework show whether lessons are sticking.`}
      >
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile
            label="Moved up an ESL level"
            value={eslLevels.retested ? `${eslLevels.movedUp} of ${eslLevels.retested}` : '—'}
            note={eslLevels.retested
              ? 'Re-tested students who placed higher'
              : `No re-tests yet. ${eslLevels.placed} of ${eslLevels.eslStudents} ESL students placed once.`}
          />
          <Tile label="Lesson quiz average" value={maybe(period.quizAverage, percent)} note={periodLabel} />
          <Tile
            label="Homework completed"
            value={maybe(period.homeworkCompletionRate, percent)}
            note={homeworkAssigned ? `${homeworkDone} of ${homeworkAssigned} assigned` : 'None assigned'}
          />
          <Tile label="Exam practice score" value={maybe(period.examAverageScore, percent)} note={periodLabel} />
        </div>
        <Charts metrics={LEARNING} weeks={weeks} />
        <Card
          title="Student progress"
          note={`Lessons, scores, homework and home practice are for the ${periodLabel}. Words mastered and ESL level are all-time. Quiz scores are each student's latest attempt.`}
        >
          <StudentProgressTable students={impact.students} />
        </Card>
      </Section>

      <Section
        id="tutors"
        question="How are tutors using Vine?"
        intro={`Vine is meant to be what tutors teach from: open the lesson's slides, give the homework, place new ESL students, and file a short wrap-up after each lesson.${
          trackingNote ? ` ${trackingNote}, so earlier lessons aren't counted in those rates.` : ''
        }`}
      >
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Taught with the slides" value={maybe(period.deckUseRate, percent)} note={`of ${count(period.deckTrackedLessons)} lessons`} />
          <Tile label="Wrap-up filed" value={maybe(period.wrapUpRate, percent)} note={`of ${count(period.wrapTrackedLessons)} lessons`} />
          <Tile label="Homework assigned" value={maybe(period.homeworkAssignedRate, percent)} note={`of ${count(period.lessonsTaught)} lessons`} />
          <Tile
            label="ESL students placed"
            value={`${eslLevels.placed} of ${eslLevels.eslStudents}`}
            note={trackingSince.placements ? `Placement test in use since ${formatDay(trackingSince.placements)}` : 'No placement tests yet'}
          />
        </div>
        <Charts metrics={TUTORING} weeks={weeks} />
        <Card
          title="By tutor"
          note={`For the ${periodLabel}. Rates under 50% are marked Low. Slide time is the average minutes a deck was on screen per class.`}
        >
          <TutorUsageTable tutors={impact.tutors} />
        </Card>
      </Section>

      <Section
        id="curriculum"
        question="Does the curriculum fit the session?"
        intro={`Each lesson is written to fill a ${SESSION_MINUTES}-minute session. Lessons are listed in their intended teaching order. Slide time only counts while the deck is on screen, so treat it as a floor: worksheets and games happen off the slides.`}
      >
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile
            label="Slide time per class"
            value={deckClasses ? minutes(deckMinutes / deckClasses) : '—'}
            note={`Average, against a ${SESSION_MINUTES}-minute session`}
          />
          <Tile
            label="Lessons finished"
            value={wrapUpsFiled ? percent(lessonsFinished / wrapUpsFiled) : '—'}
            note={`Of ${count(wrapUpsFiled)} wrap-ups`}
          />
          <Tile label="Lessons flagged" value={count(flaggedLessons)} note="Short, unfinished, or a quiz that looks too hard or easy" />
          <Tile label="ESL lessons not yet taught" value={`${untaughtEsl} of ${eslLessons.length}`} note={periodLabel} />
        </div>
        <div className="space-y-4">
          <Card title="ESL lessons" note={`For the ${periodLabel}. Flags need at least 2 classes or 3 quiz scores.`}>
            <LessonFitTable lessons={eslLessons} />
          </Card>
          {elaLessons.length > 0 && (
            <Card title="ELA lessons">
              <LessonFitTable lessons={elaLessons} />
            </Card>
          )}
        </div>
      </Section>

      <section id="check-in" className="mb-10 scroll-mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Students to check in on</h2>
        <p className="mb-3 text-sm text-slate-500">
          No practice and not marked present in the last {QUIET_AFTER_DAYS} days
          ({impact.quietStudents.length} of {impact.totalStudents} students).
        </p>
        {impact.quietStudents.length === 0 ? (
          <p className="text-sm text-slate-500">Everyone has been active recently.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {impact.quietStudents.map(student => (
              <li key={student.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="truncate text-sm font-medium text-slate-800">{student.name}</span>
                <span className="flex-shrink-0 text-xs text-slate-500">
                  {student.lastSeen === null ? 'Never active' : `${student.daysQuiet} days quiet`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Weekly numbers as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4 font-semibold">Measure</th>
                {weeks.map(week => (
                  <th key={week.weekStart} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                    {formatWeek(week.weekStart)}{week.partial ? '*' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_METRICS.map(metric => (
                <tr key={metric.key} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="whitespace-nowrap py-2 pr-4 font-medium text-slate-700">{metric.title}</th>
                  {weeks.map(week => (
                    <td key={week.weekStart} className="px-2 py-2 text-right tabular-nums text-slate-700">
                      {maybe(value(week, metric.key), metric.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">* This week so far.</p>
        </div>
      </details>
    </main>
  )
}
