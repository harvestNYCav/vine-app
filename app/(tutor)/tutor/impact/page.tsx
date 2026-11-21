import Link from 'next/link'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import { getProgramImpact, type ScoreRecord, type StudentProgress } from '@/lib/admin-metrics'
import { filterTutorRosterStudents, getTutorStudentIds } from '@/lib/tutor-roster'
import { getTutorRosterScope } from '@/lib/tutor-roster-server'
import { formatWeek } from '@/components/impact/WeeklyColumnChart'
import DrillTiles, { type DrillTile } from '@/components/impact/DrillTiles'
import { NameChips } from '@/components/impact/details'
import { count, formatDay, maybe, percent, plural } from '@/components/impact/format'
import { ACTIVE, ATTENDANCE, Charts, deltaNote, HOME, SessionPicker, TAUGHT, type TrendMetric } from '@/components/impact/shared'

// The tutor's Impact view. It reads the same figures as the admin page, but is built to encourage:
// a tutor sees their own students and their own teaching, plus what the whole team achieved
// together. It never shows another tutor's individual rates or names anyone who fell short; the
// per-tutor comparison stays on the admin page.

const BASE_PATH = '/tutor/impact'

const average = (records: ScoreRecord[]) =>
  records.length ? records.reduce((sum, record) => sum + record.score, 0) / records.length : null

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-40">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mb-3 text-sm text-slate-500">{intro}</p>
      {children}
    </section>
  )
}

function StudentLinkList({ items, tone }: {
  items: Array<{ key: string; studentId: string; name: string; detail: string; href?: string }>
  tone: 'amber' | 'green' | 'slate'
}) {
  const box = {
    amber: 'border-amber-200 bg-amber-50 hover:border-amber-400',
    green: 'border-green-200 bg-green-50 hover:border-green-400',
    slate: 'border-slate-200 bg-white hover:border-slate-400',
  }[tone]
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.key}>
          <Link
            href={item.href ?? `/tutor/${item.studentId}`}
            className={`flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 transition ${box}`}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{item.name}</span>
              <span className="block text-xs text-slate-600">{item.detail}</span>
            </span>
            <span className="flex-shrink-0 text-sm font-semibold text-amber-700" aria-hidden>→</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function TutorImpactPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session: focusParam } = await searchParams
  const session = await getSession()
  const tutorId = session!.userId
  const db = await getDb()
  const today = todayString()
  const [impact, assignedIds, rosterScope] = await Promise.all([
    getProgramImpact(db, { today, focus: focusParam }),
    getTutorStudentIds(db, tutorId),
    getTutorRosterScope(tutorId),
  ])
  const { weeks, period, focus } = impact
  const focusIndex = focus ? weeks.findIndex(week => week.weekStart === focus.weekStart) : -1
  const previousWeek = focusIndex > 0 ? weeks[focusIndex - 1] : undefined
  const scopeShort = focus ? `${formatWeek(focus.sessionDate)} week` : 'all sessions'
  const mine = rosterScope === 'assigned'

  // Your students: the same roster as the dashboard's My / All toggle.
  const students = filterTutorRosterStudents(impact.students, assignedIds, rosterScope)
  const studentIds = new Set(students.map(s => s.id))
  const byName = (a: StudentProgress, b: StudentProgress) => a.name.localeCompare(b.name)
  const active = students.filter(s => s.activeDays > 0).sort((a, b) => b.activeDays - a.activeDays || byName(a, b))
  const home = students.filter(s => s.homePracticeDays > 0).sort((a, b) => b.homePracticeDays - a.homePracticeDays || byName(a, b))
  const movedUp = students.filter(s => s.movedUp)
  const quizzes = impact.quizScores.filter(record => studentIds.has(record.studentId))
  const quizAverage = average(quizzes)
  const homeworkAssigned = students.reduce((sum, s) => sum + s.homeworkAssigned, 0)
  const homeworkDone = students.reduce((sum, s) => sum + s.homeworkDone, 0)
  const checkIn = impact.checkIn.filter(s => s.group === 'stopped' && studentIds.has(s.id))

  // Wins worth celebrating: a higher ESL level, or the most practice at home.
  const topHomeDays = home[0]?.homePracticeDays ?? 0
  const celebrate = [
    ...movedUp.map(s => ({ key: `up:${s.id}`, studentId: s.id, name: s.name, detail: `Moved up an ESL level: ${s.firstLevel} → ${s.currentLevel} 🎉` })),
    ...home
      .filter(s => s.homePracticeDays === topHomeDays && !s.movedUp)
      .slice(0, 5)
      .map(s => ({ key: `home:${s.id}`, studentId: s.id, name: s.name, detail: `Practiced at home on ${days(s.homePracticeDays)}, ${scopeShort} 🌱` })),
  ]

  // Your teaching: only your own lessons, framed as progress.
  const myLessons = impact.taughtLessons.filter(lesson => lesson.tutorId === tutorId)
  const myClasses = new Set(myLessons.map(lesson => `${lesson.date}|${lesson.slug}`)).size
  const myStudentsTaught = new Set(myLessons.map(lesson => lesson.studentId)).size
  const wrapTracked = myLessons.filter(lesson => lesson.wrapUp !== 'untracked')
  const wrapFiled = wrapTracked.filter(lesson => lesson.wrapUp === 'filed')
  const handoffTracked = myLessons.filter(lesson => lesson.handoff !== 'untracked')
  const handoffLeft = handoffTracked.filter(lesson => lesson.handoff === 'left')
  const placementsGiven = impact.tutors.find(tutor => tutor.id === tutorId)?.placementsGiven ?? 0

  // To-do: only things the tutor can still do. Wrap-ups can be filed on the day of the lesson.
  const todo = [
    ...myLessons
      .filter(lesson => lesson.date === today && lesson.wrapUp === 'missing')
      .map(lesson => ({ key: `wrap:${lesson.sessionId}`, studentId: lesson.studentId, name: lesson.studentName, detail: `File today's wrap-up for ${lesson.title}` })),
    ...students
      .filter(s => s.placementDue)
      .map(s => ({ key: `place:${s.id}`, studentId: s.id, name: s.name, detail: 'Give the ESL placement test', href: `/tutor/${s.id}/placement` })),
  ]

  // Across Vine: team totals only, never broken down by tutor.
  const tutorsTeaching = new Set(impact.taughtLessons.map(lesson => lesson.tutorId)).size
  const team = (metric: TrendMetric, id: string): DrillTile => {
    const raw = period[metric.key]
    return {
      id,
      label: metric.title,
      value: maybe(typeof raw === 'number' ? raw : null, metric.format),
      ...(focus ? deltaNote(metric, period, previousWeek) : { note: `Across ${scopeShort}`, noteTone: 'muted' as const }),
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/tutor" className="text-sm text-amber-700 hover:text-amber-900">← {mine ? 'My students' : 'All students'}</Link>
        <h1 className="mt-1 text-2xl font-bold text-amber-800">Impact</h1>
        <p className="text-sm text-slate-600">
          How your students are growing, what you&apos;ve taught, and what the whole Vine team has done together.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-amber-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="overflow-x-auto">
          <SessionPicker impact={impact} basePath={BASE_PATH} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Pick a Vine session week, or all sessions together.</p>
      </div>

      {weeks.length === 0 && <p className="mb-8 text-sm text-slate-500">No Vine sessions yet this term. Check back after the first one!</p>}

      <Section
        id="students"
        title={mine ? 'Your students' : 'All students'}
        intro={`${plural(students.length, 'student')}${mine ? ' paired with you' : ''}, ${scopeShort}. Tap a number to see who it counts.${
          mine && students.length === 0 ? ' Switch to All students above to see everyone.' : ''
        }`}
      >
        <DrillTiles
          tiles={[
            {
              id: 'active',
              label: 'Practiced in Vine',
              value: `${active.length}`,
              note: `of ${plural(students.length, 'student')}`,
              noteTone: 'muted',
              detailTitle: `Practiced in Vine, ${scopeShort}`,
              detail: (
                <NameChips
                  empty="No practice logged yet."
                  items={active.map(s => ({ key: s.id, name: s.name, meta: days(s.activeDays) }))}
                />
              ),
            },
            {
              id: 'home',
              label: 'Practiced at home',
              value: `${home.length}`,
              note: 'On a day with no session',
              noteTone: 'muted',
              detailTitle: `Practiced at home, ${scopeShort}`,
              detail: (
                <NameChips
                  empty="Nobody yet. A quick reminder at the end of class can help."
                  items={home.map(s => ({ key: s.id, name: s.name, meta: days(s.homePracticeDays) }))}
                />
              ),
            },
            {
              id: 'quiz',
              label: 'Lesson quiz average',
              value: maybe(quizAverage, percent),
              note: plural(quizzes.length, 'quiz', 'quizzes'),
              noteTone: 'muted',
              detailTitle: `Lesson quizzes, ${scopeShort}`,
              detail: (
                <NameChips
                  empty="No quizzes submitted."
                  items={[...quizzes]
                    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.date.localeCompare(b.date))
                    .map((record, index) => ({ key: `${record.studentId}:${record.slug}:${index}`, name: record.studentName, meta: `${record.title} · ${percent(record.score)}` }))}
                />
              ),
            },
            {
              id: 'homework',
              label: 'Homework completed',
              value: homeworkAssigned ? percent(homeworkDone / homeworkAssigned) : '—',
              note: homeworkAssigned ? `${homeworkDone} of ${homeworkAssigned} assigned` : 'None assigned',
              noteTone: 'muted',
              detailTitle: `Homework, ${scopeShort}`,
              detail: (
                <NameChips
                  empty="No homework assigned."
                  items={students
                    .filter(s => s.homeworkAssigned > 0)
                    .sort(byName)
                    .map(s => ({ key: s.id, name: s.name, meta: `${s.homeworkDone} of ${s.homeworkAssigned}` }))}
                />
              ),
            },
          ]}
        />

        {celebrate.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-green-800">Celebrate 🎉</h3>
            <StudentLinkList items={celebrate} tone="green" />
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Worth a check-in</h3>
          <p className="mb-2 text-xs text-slate-500">Students who haven&apos;t been seen for a few sessions. A quick hello can bring them back.</p>
          {checkIn.length === 0 ? (
            <p className="text-sm text-slate-500">Everyone has been around lately. 👏</p>
          ) : (
            <StudentLinkList
              tone="amber"
              items={checkIn.map(s => ({
                key: s.id, studentId: s.id, name: s.name,
                detail: `Missed the last ${plural(s.sessionsMissed, 'session')} · last seen ${s.lastSeen ? formatDay(s.lastSeen) : 'never'}`,
              }))}
            />
          )}
        </div>
      </Section>

      <Section id="teaching" title="Your teaching" intro={`Lessons you taught, ${scopeShort}.`}>
        <DrillTiles
          tiles={[
            { id: 'lessons', label: 'Lessons taught', value: count(myLessons.length), note: `${plural(myClasses, 'class', 'classes')} · ${plural(myStudentsTaught, 'student')}`, noteTone: 'muted' },
            {
              id: 'wraps',
              label: 'Wrap-ups filed',
              value: wrapTracked.length ? `${wrapFiled.length} of ${wrapTracked.length}` : '—',
              note: 'Helps the team see how lessons went',
              noteTone: 'muted',
            },
            {
              id: 'handoffs',
              label: 'Hand-off notes',
              value: handoffTracked.length ? `${handoffLeft.length} of ${handoffTracked.length}` : '—',
              note: "Help the student's next tutor",
              noteTone: 'muted',
            },
            { id: 'placements', label: 'ESL placements given', value: count(placementsGiven), note: 'Starts students at the right lesson', noteTone: 'muted' },
          ]}
        />
        <h3 className="mb-2 text-sm font-semibold text-slate-800">To-do</h3>
        {todo.length === 0 ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">All caught up 🎉</p>
        ) : (
          <StudentLinkList items={todo} tone="slate" />
        )}
      </Section>

      <Section id="team" title="Across Vine" intro={`What the whole team did together, ${scopeShort}.`}>
        <DrillTiles
          tiles={[
            team(TAUGHT, 'team-taught'),
            team(ACTIVE, 'team-active'),
            team(HOME, 'team-home'),
            {
              id: 'team-tutors',
              label: 'Tutors teaching',
              value: count(tutorsTeaching),
              note: `${impact.eslLevels.movedUp} ${impact.eslLevels.movedUp === 1 ? 'student has' : 'students have'} moved up an ESL level so far`,
              noteTone: impact.eslLevels.movedUp ? 'up' : 'muted',
            },
          ]}
        />
        {weeks.length > 0 && (
          <Charts
            metrics={[ACTIVE, HOME, ATTENDANCE]}
            weeks={weeks}
            selected={focus?.weekStart ?? null}
            anchor="team"
            basePath={BASE_PATH}
            columns="grid-cols-1"
          />
        )}
      </Section>
    </main>
  )
}
