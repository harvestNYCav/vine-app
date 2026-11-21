import Link from 'next/link'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import {
  addDays,
  getProgramImpact,
  MISSED_SESSIONS_TO_CHECK_IN,
  SESSION_MINUTES,
  type CheckInStudent,
} from '@/lib/admin-metrics'
import { formatWeek } from '@/components/impact/WeeklyColumnChart'
import StudentProgressTable from '@/components/impact/StudentProgressTable'
import TutorUsageTable from '@/components/impact/TutorUsageTable'
import LessonFitTable from '@/components/impact/LessonFitTable'
import DrillTiles, { type DrillTile } from '@/components/impact/DrillTiles'
import { lessonFlags } from '@/components/impact/flags'
import {
  ClassList, DeckTable, DetailBlock, Empty, ExamTable, LessonLog, NameChips, Pill, ScoreTable, Summary,
} from '@/components/impact/details'
import { count, formatDay, maybe, minutes, percent, plural } from '@/components/impact/format'
import {
  ACTIVE, ATTENDANCE, Card, Charts, deltaNote, HOME, LEARNING, Section, SessionPicker, TABLE_METRICS, TAUGHT, TUTORING, value,
  type TrendMetric,
} from '@/components/impact/shared'

const BASE_PATH = '/admin/metrics'

function CheckInCard({ student }: { student: CheckInStudent }) {
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-semibold text-slate-900">{student.name}</span>
        <span className="flex-shrink-0 text-xs font-semibold text-amber-800">Missed last {student.sessionsMissed}</span>
      </div>
      <p className="text-xs text-slate-600">
        Last seen {student.lastSeen ? formatDay(student.lastSeen) : 'never'}
        {student.vineLessons > 0 && ` · ${plural(student.vineLessons, 'Vine lesson')}`}
      </p>
      <p className="text-xs text-slate-500">
        {student.tracks.length ? student.tracks.map(track => track.toUpperCase()).join(' · ') : 'No tracks'}
        {' · '}
        {student.tutorNames.length ? `Tutor: ${student.tutorNames.join(', ')}` : 'No tutor assigned'}
      </p>
    </li>
  )
}

export default async function AdminImpactPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session } = await searchParams
  const db = await getDb()
  const today = todayString()
  const impact = await getProgramImpact(db, { today, focus: session })
  const { weeks, period, eslLevels, focus, trackingSince, students } = impact
  const focusIndex = focus ? weeks.findIndex(week => week.weekStart === focus.weekStart) : -1
  const focusWeek = weeks[focusIndex]
  const previousWeek = focusIndex > 0 ? weeks[focusIndex - 1] : undefined
  const pastSessions = weeks.filter(week => week.sessionDate <= today)

  // How the focus is named across the page.
  const scope = focus
    ? `the ${formatWeek(focus.sessionDate)} session week (${formatWeek(focus.weekStart)}–${formatWeek(addDays(focus.weekStart, 6))}${focusWeek?.partial ? ', so far' : ''})`
    : `all ${plural(weeks.length, 'session week')}`
  const scopeShort = focus ? `${formatWeek(focus.sessionDate)} week` : 'all sessions'
  const firstDay = focus?.weekStart ?? weeks[0]?.weekStart ?? today
  // Slide and wrap-up tracking were added after launch; say so when the focus reaches back before them.
  const trackingNote = [
    trackingSince.deck && trackingSince.deck > firstDay ? `Slide tracking began ${formatDay(trackingSince.deck)}` : null,
    trackingSince.wrapUps && trackingSince.wrapUps > firstDay ? `wrap-ups began ${formatDay(trackingSince.wrapUps)}` : null,
    trackingSince.handoffs && trackingSince.handoffs > firstDay ? `hand-off notes began ${formatDay(trackingSince.handoffs)}` : null,
  ].filter(Boolean).join('; ').replace(/^./, letter => letter.toUpperCase())

  const taught = impact.taughtLessons
  const tutorsTeaching = new Set(taught.map(lesson => lesson.tutorId)).size
  const classCount = new Set(taught.map(lesson => `${lesson.date}|${lesson.tutorId}|${lesson.slug}`)).size
  const homeworkAssigned = students.reduce((sum, s) => sum + s.homeworkAssigned, 0)
  const homeworkDone = students.reduce((sum, s) => sum + s.homeworkDone, 0)
  const eslLessons = impact.lessons.filter(lesson => lesson.track === 'esl')
  const eslSlugs = new Set(eslLessons.map(lesson => lesson.slug))
  const flagged = eslLessons
    .map(lesson => ({ lesson, flags: lessonFlags(lesson).filter(flag => flag.tone === 'warn') }))
    .filter(item => item.flags.length > 0)
  const taughtEsl = eslLessons.filter(lesson => lesson.classesTaught > 0)
  const untaughtEsl = eslLessons.filter(lesson => lesson.classesTaught === 0)
  const wrapUpsFiled = taught.filter(lesson => lesson.wrapUp === 'filed')
  const lessonsFinished = wrapUpsFiled.filter(lesson => lesson.finished).length
  const scheduledDecks = impact.deckSessions.filter(deck => deck.scheduled)
  const deckMinutes = scheduledDecks.reduce((sum, deck) => sum + deck.minutes, 0)
  const placementDue = students.filter(s => s.placementDue)
  const stopped = impact.checkIn.filter(s => s.group === 'stopped')
  const beforeSessions = impact.checkIn.filter(s => s.group === 'before-sessions')
  const neverActive = impact.checkIn.filter(s => s.group === 'never')

  const active = students.filter(s => s.activeDays > 0)
  const home = students.filter(s => s.homePracticeDays > 0)
  const present = students.filter(s => s.daysPresent > 0)
  const absent = students.filter(s => s.daysMarked > s.daysPresent)
  const taughtUnmarked = students.filter(s => s.lessonsAttended > 0 && s.daysMarked === 0)
  const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

  const glance = (metric: TrendMetric, tile: Omit<DrillTile, 'label' | 'value'>): DrillTile => ({
    label: metric.title,
    value: maybe(value(period, metric.key), metric.format),
    ...(focus ? deltaNote(metric, period, previousWeek) : { note: `Across ${scopeShort}`, noteTone: 'muted' as const }),
    ...tile,
  })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Students</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Impact</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Is Vine doing what it was built for? Tutors teach in-person lessons from it, students keep
          practicing between sessions, and students learn.
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <SessionPicker impact={impact} basePath={BASE_PATH} />
        <p className="mt-2 max-w-3xl text-xs text-slate-500">
          Pick a Vine session to see its week (Monday–Sunday, so practice in the days around the session counts), or all
          sessions together. Trends always show every session; click a column to jump to it. Weeks with no Vine session
          {impact.skippedWeeks.length > 0 && ` (${impact.skippedWeeks.map(week => `week of ${formatWeek(week)}`).join(', ')})`} are left out.
          {impact.testAccounts > 0 && ` ${plural(impact.testAccounts, 'test account')} (names starting with “Test”) are left out.`}
        </p>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Sections">
        {[
          ['#learning', 'Are students learning?'],
          ['#tutors', 'How are tutors using Vine?'],
          ['#curriculum', 'Does the curriculum fit?'],
          ['#check-in', `Students to check in on (${stopped.length})`],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-100">
            {label}
          </a>
        ))}
      </nav>

      {weeks.length === 0 ? (
        <p className="mb-10 text-sm text-slate-500">No Vine sessions yet this term.</p>
      ) : (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">
            {focus ? `${formatWeek(focus.sessionDate)} session at a glance` : 'All sessions at a glance'}
            <span className="font-normal text-slate-400"> · click a number to see who or what it counts</span>
          </h2>
          <DrillTiles
            tiles={[
              glance(ACTIVE, {
                id: 'active',
                detailTitle: `Active students, ${scopeShort}`,
                detail: (
                  <>
                    <DetailBlock title={`Did any practice (${active.length})`}>
                      <NameChips
                        items={active.sort((a, b) => b.activeDays - a.activeDays || a.name.localeCompare(b.name)).map(s => ({
                          key: s.id, name: s.name,
                          meta: `${days(s.activeDays)}${s.homePracticeDays ? `, ${s.homePracticeDays} at home` : ''}`,
                        }))}
                      />
                    </DetailBlock>
                    {students.some(s => s.lessonsAttended > 0 && s.activeDays === 0) && (
                      <DetailBlock title="Had a lesson but no practice logged">
                        <NameChips items={students.filter(s => s.lessonsAttended > 0 && s.activeDays === 0).map(s => ({ key: s.id, name: s.name }))} />
                      </DetailBlock>
                    )}
                  </>
                ),
              }),
              glance(HOME, {
                id: 'home',
                detailTitle: `Practiced at home, ${scopeShort}`,
                detail: (
                  <>
                    <DetailBlock title={`Used Vine on a day without a session (${home.length})`}>
                      <NameChips
                        items={home.sort((a, b) => b.homePracticeDays - a.homePracticeDays || a.name.localeCompare(b.name))
                          .map(s => ({ key: s.id, name: s.name, meta: days(s.homePracticeDays) }))}
                      />
                    </DetailBlock>
                    {active.some(s => s.homePracticeDays === 0) && (
                      <DetailBlock title="Practiced only on a session day">
                        <NameChips items={active.filter(s => s.homePracticeDays === 0).map(s => ({ key: s.id, name: s.name }))} />
                      </DetailBlock>
                    )}
                  </>
                ),
              }),
              {
                ...glance(ATTENDANCE, {
                  id: 'attendance',
                  detailTitle: `Attendance, ${scopeShort}`,
                  detail: (
                    <>
                      {period.attendanceMarked === 0 && (
                        <Summary>No attendance was taken. Tutors mark students present on the Cohort page.</Summary>
                      )}
                      <DetailBlock title={`Present (${present.length})`}>
                        <NameChips items={present.map(s => ({ key: s.id, name: s.name, meta: focus ? undefined : `${s.daysPresent}×` }))} />
                      </DetailBlock>
                      {absent.length > 0 && (
                        <DetailBlock title={`Marked absent (${absent.length})`}>
                          <NameChips items={absent.map(s => ({ key: s.id, name: s.name }))} />
                        </DetailBlock>
                      )}
                      {taughtUnmarked.length > 0 && (
                        <DetailBlock title={`Had a lesson, attendance not taken (${taughtUnmarked.length})`}>
                          <NameChips items={taughtUnmarked.map(s => ({ key: s.id, name: s.name }))} />
                        </DetailBlock>
                      )}
                    </>
                  ),
                }),
                ...(period.attendanceMarked === 0 ? { note: 'No attendance taken', noteTone: 'muted' as const } : {}),
              },
              glance(TAUGHT, {
                id: 'taught',
                detailTitle: `Lessons taught, ${scopeShort}: who taught whom`,
                detail: (
                  <>
                    <Summary>
                      {plural(taught.length, 'lesson')} in {plural(classCount, 'class', 'classes')} by {plural(tutorsTeaching, 'tutor')}.
                      Each row is one tutor teaching one lesson; the full lesson-by-lesson record is under
                      “Taught with the slides” below.
                    </Summary>
                    <ClassList lessons={taught} />
                  </>
                ),
              }),
            ]}
          />
        </section>
      )}

      <Section
        id="learning"
        question="Are students learning?"
        intro={`Scores and homework for ${scope}, and ESL level changes since each student's first placement test. A re-test is the clearest sign of growth; quiz scores and homework show whether lessons are sticking.`}
      >
        <DrillTiles
          tiles={[
            {
              id: 'levels',
              label: 'Moved up an ESL level',
              value: eslLevels.retested ? `${eslLevels.movedUp} of ${eslLevels.retested}` : '—',
              note: eslLevels.retested
                ? 'Re-tested students who placed higher (all-time)'
                : `No re-tests yet. ${eslLevels.placed} of ${eslLevels.eslStudents} ESL students placed once.`,
              detailTitle: 'ESL placements (all-time)',
              detail: (
                <>
                  {students.some(s => s.placements > 1) && (
                    <DetailBlock title="Re-tested">
                      <NameChips items={students.filter(s => s.placements > 1).map(s => ({
                        key: s.id, name: s.name, meta: `${s.firstLevel} → ${s.currentLevel}${s.movedUp ? ' ▲' : ''}`,
                      }))} />
                    </DetailBlock>
                  )}
                  <DetailBlock title="Placed once (re-test to measure growth)">
                    <NameChips items={students.filter(s => s.placements === 1).map(s => ({ key: s.id, name: s.name, meta: s.currentLevel ?? undefined }))} />
                  </DetailBlock>
                </>
              ),
            },
            {
              id: 'quiz',
              label: 'Lesson quiz average',
              value: maybe(period.quizAverage, percent),
              note: `${plural(impact.quizScores.length, 'quiz', 'quizzes')}, ${scopeShort}`,
              detailTitle: `Lesson quizzes and homework scores, ${scopeShort}`,
              detail: (
                <>
                  <DetailBlock title="Quiz scores (lowest first)"><ScoreTable records={impact.quizScores} what="quizzes" /></DetailBlock>
                  <DetailBlock title="Homework scores (lowest first)"><ScoreTable records={impact.homeworkScores} what="homework" /></DetailBlock>
                </>
              ),
            },
            {
              id: 'homework-done',
              label: 'Homework completed',
              value: maybe(period.homeworkCompletionRate, percent),
              note: homeworkAssigned ? `${homeworkDone} of ${homeworkAssigned} assigned` : 'None assigned',
              detailTitle: `Assigned homework, ${scopeShort}`,
              detail: <LessonLog lessons={taught} check="done" />,
            },
            {
              id: 'exam',
              label: 'Exam practice score',
              value: maybe(period.examAverageScore, percent),
              note: `${plural(impact.examScores.length, 'section')}, ${scopeShort}`,
              detailTitle: `Exam practice, ${scopeShort}`,
              detail: <ExamTable records={impact.examScores} />,
            },
          ]}
        />
        <Charts metrics={LEARNING} weeks={weeks} selected={focus?.weekStart ?? null} anchor="learning" basePath={BASE_PATH} />
        <Card
          title="Student progress"
          note={`Lessons, scores, homework and home practice are for ${scope}. Words mastered, ESL level and last seen are all-time. Quiz scores are each student's latest attempt.`}
        >
          <StudentProgressTable students={students} singleWeek={focus !== null} scopeLabel={focus ? 'this week' : 'in any session'} />
        </Card>
      </Section>

      <Section
        id="tutors"
        question="How are tutors using Vine?"
        intro={`Vine is meant to be what tutors teach from: open the lesson's slides, give the homework, place new ESL students, and file a short wrap-up after each lesson. Figures are for ${scope}.${
          trackingNote ? ` ${trackingNote}, so earlier lessons aren't counted in those rates.` : ''
        }`}
      >
        <DrillTiles
          tiles={[
            {
              id: 'deck',
              label: 'Taught with the slides',
              value: maybe(period.deckUseRate, percent),
              note: `of ${plural(period.deckTrackedLessons, 'lesson')}`,
              detailTitle: `Was the slide deck opened? ${scopeShort}`,
              detail: <LessonLog lessons={taught} check="deck" />,
            },
            {
              id: 'wrap',
              label: 'Wrap-up filed',
              value: maybe(period.wrapUpRate, percent),
              note: `of ${plural(period.wrapTrackedLessons, 'lesson')}`,
              detailTitle: `Was a wrap-up filed? ${scopeShort}`,
              detail: <LessonLog lessons={taught} check="wrap" />,
            },
            {
              id: 'handoff',
              label: 'Hand-off left',
              value: maybe(period.handoffRate, percent),
              note: period.handoffTrackedLessons
                ? `${period.handoffLessons} of ${plural(period.handoffTrackedLessons, 'lesson')}`
                : 'No hand-off notes yet',
              noteTone: period.handoffTrackedLessons ? undefined : 'muted',
              detailTitle: `Did the tutor leave a note for the next tutor? ${scopeShort}`,
              detail: <LessonLog lessons={taught} check="handoff" />,
            },
            {
              id: 'homework',
              label: 'Homework assigned',
              value: maybe(period.homeworkAssignedRate, percent),
              note: `of ${plural(period.lessonsTaught, 'lesson')}`,
              detailTitle: `Was homework assigned? ${scopeShort}`,
              detail: <LessonLog lessons={taught} check="homework" />,
            },
            {
              id: 'placed',
              label: 'ESL students placed',
              value: `${eslLevels.placed}`,
              note: placementDue.length
                ? `${placementDue.length} taught since ${formatDay(trackingSince.placements!)} still need the test`
                : trackingSince.placements ? `Placement test in use since ${formatDay(trackingSince.placements)}` : 'No placement tests yet',
              noteTone: placementDue.length ? 'down' : 'muted',
              detailTitle: 'ESL placement (all-time)',
              detail: (
                <>
                  <DetailBlock title={`Need a placement test (${placementDue.length})`}>
                    <NameChips
                      empty="Every ESL student taught since the test began has been placed."
                      items={placementDue.map(s => ({ key: s.id, name: s.name, meta: s.tutorNames.length ? s.tutorNames.join(', ') : 'no tutor' }))}
                    />
                  </DetailBlock>
                  <DetailBlock title={`Placed (${impact.placementRecords.length} tests)`}>
                    {impact.placementRecords.length === 0 ? <Empty>No placement tests yet.</Empty> : (
                      <NameChips items={impact.placementRecords.map((record, index) => ({
                        key: `${record.studentId}:${index}`, name: record.studentName,
                        meta: `${record.level} · ${formatDay(record.date)} · ${record.tutorName}`,
                      }))} />
                    )}
                  </DetailBlock>
                </>
              ),
            },
          ]}
        />
        <Charts metrics={TUTORING} weeks={weeks} selected={focus?.weekStart ?? null} anchor="tutors" basePath={BASE_PATH} />
        <Card
          title="By tutor"
          note={`For ${scope}. Rates under 50% are marked Low. Slide time is the average minutes a deck was on screen per class. Click a student count to see who.`}
        >
          <TutorUsageTable tutors={impact.tutors} />
        </Card>
      </Section>

      <Section
        id="curriculum"
        question="Does the curriculum fit the session?"
        intro={`Each lesson is written to fill a ${SESSION_MINUTES}-minute session. Lessons are listed in their intended teaching order, for ${scope}. Slide time only counts while the deck is on screen, so treat it as a floor: worksheets and games happen off the slides.`}
      >
        <DrillTiles
          tiles={[
            {
              id: 'slide-time',
              label: 'Slide time per class',
              value: scheduledDecks.length ? minutes(deckMinutes / scheduledDecks.length) : '—',
              note: `Average of ${plural(scheduledDecks.length, 'class', 'classes')}, against ${SESSION_MINUTES} min`,
              detailTitle: `Slides on screen, ${scopeShort}`,
              detail: (
                <>
                  <Summary>
                    The average counts decks opened for a scheduled lesson. Decks opened with no lesson scheduled that day are
                    listed but left out of it.
                  </Summary>
                  <DeckTable decks={impact.deckSessions} />
                </>
              ),
            },
            {
              id: 'finished',
              label: 'Lessons finished',
              value: wrapUpsFiled.length ? percent(lessonsFinished / wrapUpsFiled.length) : '—',
              note: `${lessonsFinished} of ${plural(wrapUpsFiled.length, 'wrap-up')}`,
              detailTitle: `Wrap-ups, ${scopeShort}`,
              detail: <LessonLog lessons={wrapUpsFiled} />,
            },
            {
              id: 'flagged',
              label: 'ESL lessons flagged',
              value: count(flagged.length),
              note: 'Short, unfinished, or a quiz that looks too hard or easy',
              detailTitle: 'Flagged lessons',
              detail: flagged.length === 0 ? <Empty>No lessons flagged. Flags need at least 2 classes or 3 quiz scores.</Empty> : (
                <ul className="space-y-2">
                  {flagged.map(({ lesson, flags }) => (
                    <li key={lesson.slug} className="text-sm">
                      <span className="font-semibold text-slate-800">{lesson.position}. {lesson.title}</span>
                      {flags.map(flag => (
                        <span key={flag.label} className="ml-2"><Pill tone="warn">{flag.label}</Pill> <span className="text-slate-600">{flag.why}</span></span>
                      ))}
                    </li>
                  ))}
                </ul>
              ),
            },
            focus ? {
              id: 'esl-taught',
              label: 'ESL lessons taught',
              value: `${taughtEsl.length}`,
              note: `of ${eslLessons.length}, ${scopeShort}`,
              detailTitle: `ESL lessons taught, ${scopeShort}`,
              detail: <ClassList lessons={taught.filter(lesson => eslSlugs.has(lesson.slug))} />,
            } : {
              id: 'esl-untaught',
              label: 'ESL lessons not yet taught',
              value: `${untaughtEsl.length} of ${eslLessons.length}`,
              note: `across ${scopeShort}`,
              detailTitle: 'ESL lessons not yet taught',
              detail: <NameChips items={untaughtEsl.map(lesson => ({ key: lesson.slug, name: `${lesson.position}. ${lesson.title}` }))} empty="Every ESL lesson has been taught." />,
            },
          ]}
        />
        <Card
          title="ESL lessons"
          note={`For ${scope}. Flags need at least 2 classes or 3 quiz scores. Click a lesson to see its classes, slides, wrap-ups and scores.`}
        >
          <LessonFitTable
            lessons={eslLessons}
            taught={taught}
            decks={impact.deckSessions}
            quizzes={impact.quizScores}
            homework={impact.homeworkScores}
          />
        </Card>
      </Section>

      <section id="check-in" className="mb-10 scroll-mt-36 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Students to check in on</h2>
        <p className="mb-4 max-w-3xl text-sm text-slate-500">
          As of today, whatever session is picked above. Vine sessions held so far: {pastSessions.map(week => formatWeek(week.sessionDate)).join(', ') || 'none'}.
          “Seen” means any practice in Vine or being marked present.
        </p>

        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          Came to Vine, then stopped ({stopped.length})
          <span className="font-normal text-slate-500"> · missed the last {MISSED_SESSIONS_TO_CHECK_IN}+ sessions, most recent drop-offs first</span>
        </h3>
        {stopped.length === 0 ? (
          <Empty>Nobody has dropped off. Everyone who has come to a Vine session was seen in the last {MISSED_SESSIONS_TO_CHECK_IN} sessions.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stopped.map(student => <CheckInCard key={student.id} student={student} />)}
          </ul>
        )}

        {beforeSessions.length > 0 && (
          <details className="mt-4 rounded-lg bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Quiet since before Vine sessions began ({beforeSessions.length})
              <span className="font-normal text-slate-500"> · used Vine before {formatDay(pastSessions[0].sessionDate)}, not since</span>
            </summary>
            <div className="mt-3">
              <NameChips items={beforeSessions.map(s => ({
                key: s.id, name: s.name, meta: `last ${formatDay(s.lastSeen!)}${s.tutorNames.length ? ` · ${s.tutorNames.join(', ')}` : ''}`,
              }))} />
            </div>
          </details>
        )}

        {neverActive.length > 0 && (
          <details className="mt-3 rounded-lg bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Never used Vine ({neverActive.length})
              <span className="font-normal text-slate-500"> · may not have started yet, or the account may not be needed</span>
            </summary>
            <div className="mt-3">
              <NameChips items={neverActive.map(s => ({
                key: s.id, name: s.name,
                meta: [s.tracks.length ? s.tracks.map(t => t.toUpperCase()).join('·') : 'no tracks', s.tutorNames.join(', ')].filter(Boolean).join(' · '),
              }))} />
            </div>
          </details>
        )}
      </section>

      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Every session&apos;s numbers as a table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-4 font-semibold">Measure</th>
                {weeks.map(week => (
                  <th key={week.weekStart} className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                    {formatWeek(week.sessionDate)}{week.partial ? '*' : ''}
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
