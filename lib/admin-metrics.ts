import type { Client } from '@libsql/client'
import { ALL_MODULES } from '@/content/modules'
import { ESL_LEVELS } from '@/content/esl-placement'
import type { Track } from '@/types'
import { localDateKey } from './dates'

// The admin Impact page: is Vine doing what it was built for? Tutors teach in-person lessons from
// it, students practice between sessions, and students learn. Everything here is derived from
// tables that already exist; nothing new is recorded. Weeks run Monday–Sunday in the program time
// zone, keyed by their Monday as a `YYYY-MM-DD` string.
//
// Only session weeks count: weeks in which an in-person session was actually held. A week the
// program skipped (a holiday, a retreat) would otherwise show as a dip in every measure, so it is
// left out of the trends, the week-over-week comparison and the period totals alike, and the window
// reaches further back to make up the number of weeks asked for.

export const TREND_WEEK_OPTIONS = [4, 8, 12] as const
export type TrendWeeks = (typeof TREND_WEEK_OPTIONS)[number]
export const DEFAULT_TREND_WEEKS: TrendWeeks = 8

// A student with no practice and no attendance for this long is listed as gone quiet.
export const QUIET_AFTER_DAYS = 14
// The in-person session the lessons are written to fill.
export const SESSION_MINUTES = 120

const DAY_MS = 86_400_000

export function parseTrendWeeks(value: unknown): TrendWeeks {
  const weeks = Number(value)
  return (TREND_WEEK_OPTIONS as readonly number[]).includes(weeks) ? weeks as TrendWeeks : DEFAULT_TREND_WEEKS
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addDays(key: string, days: number): string {
  const date = dateFromKey(key)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dateFromKey(toKey).getTime() - dateFromKey(fromKey).getTime()) / DAY_MS)
}

// The Monday on or before a calendar date.
export function weekStartOf(key: string): string {
  const mondayOffset = (dateFromKey(key).getUTCDay() + 6) % 7
  return addDays(key, -mondayOffset)
}

// The weeks to report on, oldest first: the most recent `weeks - 1` past weeks in which a session
// was held (`heldDates`), then the current week, which is always shown as "so far". Also returns the
// skipped weeks between the first reported week and now, so the page can say what was left out.
export function sessionWeekStarts(
  today: string,
  weeks: number,
  heldDates: Iterable<string>,
): { weekStarts: string[]; skipped: string[] } {
  const current = weekStartOf(today)
  const held = new Set<string>()
  for (const date of heldDates) {
    if (date <= today) held.add(weekStartOf(date))
  }
  const past = [...held].filter(week => week < current).sort().slice(-(weeks - 1))
  const weekStarts = [...past, current]
  const skipped: string[] = []
  for (let week = weekStarts[0]; week < current; week = addDays(week, 7)) {
    if (!held.has(week)) skipped.push(week)
  }
  return { weekStarts, skipped }
}

const ratio = (part: number, whole: number) => whole > 0 ? part / whole : null

class Mean {
  sum = 0
  n = 0
  add(value: number) { this.sum += value; this.n++ }
  get value(): number | null { return this.n > 0 ? this.sum / this.n : null }
}

// Figures for one week, or for the whole selected period.
export interface PeriodMetrics {
  // Students with any logged practice (lessons, vocab, math, exams).
  activeStudents: number
  // Students who practiced on a day they had no session: Vine used between sessions, as intended.
  homePracticeStudents: number
  attendanceMarked: number
  attendancePresent: number
  // Present ÷ marked. Unmarked students are left out, not counted absent.
  attendanceRate: number | null
  tutorsTeaching: number
  // Scheduled lessons on past dates whose student was not marked absent.
  lessonsTaught: number
  // Lessons the slide and wrap-up rates are measured over (those after each kind of tracking began).
  deckTrackedLessons: number
  wrapTrackedLessons: number
  // Of those lessons, the share where a tutor opened that lesson's slide deck that day. Lessons from
  // before slide tracking existed are left out (see `trackingSince`), as are wrap-ups below.
  deckUseRate: number | null
  // ... the share with a tutor wrap-up filed.
  wrapUpRate: number | null
  // ... the share where the tutor assigned the lesson's homework.
  homeworkAssignedRate: number | null
  // Of the lessons with homework assigned, the share whose homework the student finished after the
  // lesson. Recent lessons may still be in progress.
  homeworkCompletionRate: number | null
  // Average score (0–1) of lesson quizzes and homework submitted in the period. A redo replaces the
  // earlier score, so this counts each student's latest attempt.
  quizAverage: number | null
  homeworkAverage: number | null
  // Average score (0–1) on finished Grade 3–8 and Regents exam sections.
  examAverageScore: number | null
}

export interface WeeklyMetrics extends PeriodMetrics {
  weekStart: string
  // True for the week containing today, whose numbers are still growing.
  partial: boolean
}

export interface StudentProgress {
  id: string
  name: string
  tracks: Track[]
  // ESL placement levels (labels): the first test and the latest. Null if never placed.
  firstLevel: string | null
  currentLevel: string | null
  placements: number
  movedUp: boolean
  // An ESL student whose first lesson came after the placement test existed, with no placement yet.
  placementDue: boolean
  lessonsAttended: number
  quizAverage: number | null
  homeworkAssigned: number
  homeworkDone: number
  homePracticeDays: number
  wordsMastered: number
  lastSeen: string | null
}

export interface TutorUsage {
  id: string
  name: string
  sessionDays: number
  lessonsTaught: number
  studentsTaught: number
  deckUseRate: number | null
  averageDeckMinutes: number | null
  wrapUpRate: number | null
  homeworkAssignedRate: number | null
  averageRatingGiven: number | null
  placementsGiven: number
  lastTaught: string | null
}

export interface LessonFit {
  slug: string
  title: string
  track: Track
  // 1-based position in the intended teaching order within its track.
  position: number
  // Classes taught (one per tutor per day, however many students were in it) and students taught.
  classesTaught: number
  studentsTaught: number
  averageDeckMinutes: number | null
  // Classes with slide-deck data behind the averages above and below.
  deckClasses: number
  // How far through the deck tutors got, 0–1.
  averageDeckReach: number | null
  finishedRate: number | null
  wrapUps: number
  // The most common "stopped at" note on unfinished wrap-ups.
  commonStoppingPoint: string | null
  averageRating: number | null
  quizAverage: number | null
  quizCount: number
  homeworkAverage: number | null
  homeworkCount: number
}

export interface QuietStudent {
  id: string
  name: string
  // The most recent day with practice or attendance, or null if there has never been any.
  lastSeen: string | null
  daysQuiet: number | null
}

export interface EslLevelSummary {
  eslStudents: number
  placed: number
  retested: number
  movedUp: number
}

// The first day with any data for features added after launch. Null if there is no data yet.
export interface TrackingSince {
  deck: string | null
  wrapUps: string | null
  placements: string | null
}

export interface ProgramImpact {
  today: string
  trackingSince: TrackingSince
  // Session weeks only (see the note at the top); the last is the current week.
  weeks: WeeklyMetrics[]
  // Past weeks inside the reported span with no in-person session, which are left out.
  skippedWeeks: string[]
  period: PeriodMetrics
  students: StudentProgress[]
  tutors: TutorUsage[]
  lessons: LessonFit[]
  eslLevels: EslLevelSummary
  totalStudents: number
  quietStudents: QuietStudent[]
}

// Accumulates the raw counts for one bucket (a week, or the whole period).
class Bucket {
  active = new Set<string>()
  homePractice = new Set<string>()
  tutors = new Set<string>()
  attendanceMarked = 0
  attendancePresent = 0
  lessonsTaught = 0
  // Lessons on or after the day slide and wrap-up tracking began; earlier ones have no data.
  deckTracked = 0
  deckUsed = 0
  wrapTracked = 0
  wrapUps = 0
  homeworkAssigned = 0
  homeworkDone = 0
  quiz = new Mean()
  homework = new Mean()
  exam = new Mean()

  finish(): PeriodMetrics {
    return {
      activeStudents: this.active.size,
      homePracticeStudents: this.homePractice.size,
      attendanceMarked: this.attendanceMarked,
      attendancePresent: this.attendancePresent,
      attendanceRate: ratio(this.attendancePresent, this.attendanceMarked),
      tutorsTeaching: this.tutors.size,
      lessonsTaught: this.lessonsTaught,
      deckTrackedLessons: this.deckTracked,
      wrapTrackedLessons: this.wrapTracked,
      deckUseRate: ratio(this.deckUsed, this.deckTracked),
      wrapUpRate: ratio(this.wrapUps, this.wrapTracked),
      homeworkAssignedRate: ratio(this.homeworkAssigned, this.lessonsTaught),
      homeworkCompletionRate: ratio(this.homeworkDone, this.homeworkAssigned),
      quizAverage: this.quiz.value,
      homeworkAverage: this.homework.value,
      examAverageScore: this.exam.value,
    }
  }
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) { best = value; bestCount = count }
  }
  return best
}

export async function getProgramImpact(
  db: Client,
  options: { today: string; weeks: number; now?: number; timeZone?: string },
): Promise<ProgramImpact> {
  const { today, weeks: weekCount } = options
  const now = options.now ?? Date.now()
  const toKey = (ms: number) => localDateKey(ms, options.timeZone)
  // A session was held on a day a tutor checked in, a student was marked present, a lesson's slides
  // were opened or a wrap-up was filed.
  const held = await db.execute({
    sql: `SELECT session_date AS date FROM tutor_check_ins WHERE present = 1
          UNION SELECT session_date FROM attendance WHERE present = 1
          UNION SELECT date FROM lesson_deck_progress
          UNION SELECT s.date FROM session_wrap_ups w JOIN sessions s ON s.id = w.session_id`,
    args: [],
  })
  const { weekStarts, skipped: skippedWeeks } = sessionWeekStarts(today, weekCount, held.rows.map(row => String(row.date)))
  const reportedWeeks = new Set(weekStarts)
  const firstDay = weekStarts[0]
  const lastDay = addDays(weekStarts[weekStarts.length - 1], 6)
  // Timestamps are bucketed by their program-local date, so fetch a day of slack on either side of
  // the UTC range and let the date-key check decide.
  const sinceMs = now - (daysBetween(firstDay, today) + 2) * DAY_MS
  const quietSince = addDays(today, -QUIET_AFTER_DAYS)
  // Inside the reported span and in a session week; days in skipped weeks count for nothing.
  const inRange = (date: string) => date >= firstDay && date <= lastDay && reportedWeeks.has(weekStartOf(date))

  const [
    studentRows, trackRows, tutorRows, activity, sessions, attendance, checkIns, wrapUps, deck,
    progress, mathExams, elaExams, placements, vocab, lastActivity, lastAttendance, firstLessons, since,
  ] = await Promise.all([
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'student' ORDER BY name", args: [] }),
    db.execute({ sql: 'SELECT user_id, track FROM user_tracks', args: [] }),
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'tutor' ORDER BY name", args: [] }),
    db.execute({
      sql: `SELECT a.user_id, a.date FROM activity_log a JOIN users u ON u.id = a.user_id
            WHERE u.role = 'student' AND a.date BETWEEN ? AND ?`,
      args: [firstDay, lastDay],
    }),
    db.execute({
      // Deleting a student leaves their scheduled lessons behind; only count students who still exist.
      sql: `SELECT s.id, s.student_id, s.date, s.module_slug, s.tutor_id, s.homework_assigned FROM sessions s
            JOIN users u ON u.id = s.student_id AND u.role = 'student'
            WHERE s.date BETWEEN ? AND ?`,
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: 'SELECT session_date AS date, student_id, present FROM attendance WHERE session_date BETWEEN ? AND ?',
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: 'SELECT session_date AS date, tutor_id FROM tutor_check_ins WHERE present = 1 AND session_date BETWEEN ? AND ?',
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: `SELECT w.session_id, w.tutor_id, w.rating, w.finished_lesson, w.stopped_at FROM session_wrap_ups w
            JOIN sessions s ON s.id = w.session_id WHERE s.date BETWEEN ? AND ?`,
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: `SELECT tutor_id, date, module_slug, furthest_slide, slide_count, active_ms FROM lesson_deck_progress
            WHERE date BETWEEN ? AND ?`,
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: `SELECT user_id, module_slug, practice_completed_at, practice_score, homework_completed_at, homework_score
            FROM module_progress WHERE practice_completed_at >= ? OR homework_completed_at >= ?`,
      args: [sinceMs, sinceMs],
    }),
    db.execute({
      sql: 'SELECT finished_at, points_earned, points_possible FROM math_exam_attempts WHERE finished_at >= ?',
      args: [sinceMs],
    }),
    db.execute({
      sql: 'SELECT finished_at, points_earned, points_possible FROM ela_exam_attempts WHERE finished_at >= ?',
      args: [sinceMs],
    }),
    db.execute({
      sql: `SELECT p.student_id, p.tutor_id, p.date, p.level FROM esl_placements p
            JOIN users u ON u.id = p.student_id AND u.role = 'student' ORDER BY p.created_at`,
      args: [],
    }),
    db.execute({
      sql: 'SELECT user_id, COUNT(*) AS words FROM vocab_progress WHERE correct_count >= 3 GROUP BY user_id',
      args: [],
    }),
    db.execute({ sql: 'SELECT user_id, MAX(date) AS date FROM activity_log GROUP BY user_id', args: [] }),
    db.execute({
      sql: 'SELECT student_id, MAX(session_date) AS date FROM attendance WHERE present = 1 GROUP BY student_id',
      args: [],
    }),
    db.execute({ sql: 'SELECT student_id, MIN(date) AS date FROM sessions GROUP BY student_id', args: [] }),
    db.execute({
      sql: `SELECT
              (SELECT MIN(date) FROM lesson_deck_progress) AS deck,
              (SELECT MIN(s.date) FROM session_wrap_ups w JOIN sessions s ON s.id = w.session_id) AS wrap_ups,
              (SELECT MIN(date) FROM esl_placements) AS placements`,
      args: [],
    }),
  ])

  const sinceRow = since.rows[0]
  const sinceValue = (value: unknown) => value === null || value === undefined ? null : String(value)
  const trackingSince: TrackingSince = {
    deck: sinceValue(sinceRow?.deck),
    wrapUps: sinceValue(sinceRow?.wrap_ups),
    placements: sinceValue(sinceRow?.placements),
  }
  const tracked = (since: string | null, date: string) => since !== null && date >= since

  const studentIds = new Set(studentRows.rows.map(row => String(row.id)))
  const weekBuckets = new Map(weekStarts.map(start => [start, new Bucket()]))
  const total = new Bucket()
  // Each fact counts toward its week and toward the whole period.
  const bucketsFor = (date: string | null): Bucket[] => {
    if (!date || !inRange(date)) return []
    const week = weekBuckets.get(weekStartOf(date))
    return week ? [week, total] : []
  }

  // Per-student, per-tutor and per-lesson tallies for the period.
  const student = new Map<string, {
    lessons: number; quiz: Mean; homeworkAssigned: number; homeworkDone: number; homeDays: Set<string>
  }>()
  const studentTally = (id: string) => {
    let tally = student.get(id)
    if (!tally) {
      tally = { lessons: 0, quiz: new Mean(), homeworkAssigned: 0, homeworkDone: 0, homeDays: new Set() }
      student.set(id, tally)
    }
    return tally
  }
  const tutor = new Map<string, {
    days: Set<string>; lessons: number; students: Set<string>; deckTracked: number; deckUsed: number
    deckMinutes: Mean; wrapTracked: number; wrapUps: number; homeworkAssigned: number; rating: Mean; placements: number; lastTaught: string | null
  }>()
  const tutorTally = (id: string) => {
    let tally = tutor.get(id)
    if (!tally) {
      tally = {
        days: new Set(), lessons: 0, students: new Set(), deckTracked: 0, deckUsed: 0, deckMinutes: new Mean(),
        wrapTracked: 0, wrapUps: 0,
        homeworkAssigned: 0, rating: new Mean(), placements: 0, lastTaught: null,
      }
      tutor.set(id, tally)
    }
    return tally
  }
  const lesson = new Map<string, {
    classes: Set<string>; students: number; deckMinutes: Mean; deckReach: Mean; finished: number
    wrapUps: number; stops: string[]; rating: Mean; quiz: Mean; homework: Mean
  }>()
  const lessonTally = (slug: string) => {
    let tally = lesson.get(slug)
    if (!tally) {
      tally = {
        classes: new Set(), students: 0, deckMinutes: new Mean(), deckReach: new Mean(), finished: 0,
        wrapUps: 0, stops: [], rating: new Mean(), quiz: new Mean(), homework: new Mean(),
      }
      lesson.set(slug, tally)
    }
    return tally
  }

  // Attendance: who was marked present or absent on each day.
  const marks = new Map<string, boolean>()
  for (const row of attendance.rows) {
    const date = String(row.date)
    const present = Number(row.present) === 1
    marks.set(`${row.student_id}:${date}`, present)
    for (const bucket of bucketsFor(date)) {
      bucket.attendanceMarked++
      if (present) bucket.attendancePresent++
    }
  }
  for (const row of checkIns.rows) {
    const date = String(row.date)
    if (!inRange(date)) continue
    for (const bucket of bucketsFor(date)) bucket.tutors.add(String(row.tutor_id))
    tutorTally(String(row.tutor_id)).days.add(date)
  }

  // A deck counts as used for a lesson if any tutor opened that lesson's deck that day.
  const deckOpened = new Set<string>()
  for (const row of deck.rows) {
    const slug = String(row.module_slug)
    deckOpened.add(`${row.date}:${slug}`)
    if (!inRange(String(row.date))) continue
    const minutes = Number(row.active_ms) / 60_000
    const slideCount = Number(row.slide_count)
    tutorTally(String(row.tutor_id)).deckMinutes.add(minutes)
    const tally = lessonTally(slug)
    tally.deckMinutes.add(minutes)
    if (slideCount > 0) tally.deckReach.add(Math.min(1, (Number(row.furthest_slide) + 1) / slideCount))
  }

  const wrapUpBySession = new Map(wrapUps.rows.map(row => [String(row.session_id), row]))
  const homeworkDoneAt = new Map<string, string>()
  for (const row of progress.rows) {
    if (row.homework_completed_at !== null) {
      homeworkDoneAt.set(`${row.user_id}:${row.module_slug}`, toKey(Number(row.homework_completed_at)))
    }
  }

  const sessionDays = new Set<string>()
  for (const row of sessions.rows) {
    const date = String(row.date)
    const studentId = String(row.student_id)
    const slug = String(row.module_slug)
    sessionDays.add(`${studentId}:${date}`)
    if (!inRange(date) || date > today || marks.get(`${studentId}:${date}`) === false) continue

    const deckTracked = tracked(trackingSince.deck, date)
    const wrapTracked = tracked(trackingSince.wrapUps, date)
    const deckUsed = deckOpened.has(`${date}:${slug}`)
    const wrapUp = wrapUpBySession.get(String(row.id))
    const homeworkAssigned = Number(row.homework_assigned) === 1
    const doneOn = homeworkDoneAt.get(`${studentId}:${slug}`)
    const homeworkDone = homeworkAssigned && doneOn !== undefined && doneOn >= date
    for (const bucket of bucketsFor(date)) {
      bucket.lessonsTaught++
      if (deckTracked) bucket.deckTracked++
      if (deckUsed) bucket.deckUsed++
      if (wrapTracked) bucket.wrapTracked++
      if (wrapUp) bucket.wrapUps++
      if (homeworkAssigned) bucket.homeworkAssigned++
      if (homeworkDone) bucket.homeworkDone++
    }

    const tutorId = String(row.tutor_id)
    const t = tutorTally(tutorId)
    t.lessons++
    t.students.add(studentId)
    if (deckTracked) t.deckTracked++
    if (deckUsed) t.deckUsed++
    if (wrapTracked) t.wrapTracked++
    if (wrapUp) t.wrapUps++
    if (homeworkAssigned) t.homeworkAssigned++
    if (date > (t.lastTaught ?? '')) t.lastTaught = date

    const s = studentTally(studentId)
    s.lessons++
    if (homeworkAssigned) s.homeworkAssigned++
    if (homeworkDone) s.homeworkDone++

    const l = lessonTally(slug)
    l.classes.add(`${tutorId}:${date}`)
    l.students++
    if (wrapUp) {
      l.wrapUps++
      l.rating.add(Number(wrapUp.rating))
      t.rating.add(Number(wrapUp.rating))
      if (Number(wrapUp.finished_lesson) === 1) l.finished++
      else if (wrapUp.stopped_at) l.stops.push(String(wrapUp.stopped_at))
    }
  }

  for (const row of activity.rows) {
    const date = String(row.date)
    const id = String(row.user_id)
    const atHome = !sessionDays.has(`${id}:${date}`)
    for (const bucket of bucketsFor(date)) {
      bucket.active.add(id)
      if (atHome) bucket.homePractice.add(id)
    }
    if (atHome && inRange(date)) studentTally(id).homeDays.add(date)
  }

  for (const row of progress.rows) {
    const slug = String(row.module_slug)
    if (row.practice_completed_at !== null && row.practice_score !== null) {
      const date = toKey(Number(row.practice_completed_at))
      const score = Number(row.practice_score) / 100
      const buckets = bucketsFor(date)
      for (const bucket of buckets) bucket.quiz.add(score)
      if (buckets.length) {
        lessonTally(slug).quiz.add(score)
        studentTally(String(row.user_id)).quiz.add(score)
      }
    }
    if (row.homework_completed_at !== null && row.homework_score !== null) {
      const date = toKey(Number(row.homework_completed_at))
      const score = Number(row.homework_score) / 100
      const buckets = bucketsFor(date)
      for (const bucket of buckets) bucket.homework.add(score)
      if (buckets.length) lessonTally(slug).homework.add(score)
    }
  }

  for (const row of [...mathExams.rows, ...elaExams.rows]) {
    const possible = Number(row.points_possible ?? 0)
    if (possible <= 0) continue
    for (const bucket of bucketsFor(toKey(Number(row.finished_at)))) {
      bucket.exam.add(Number(row.points_earned ?? 0) / possible)
    }
  }

  // ESL levels across the whole program, not just the period: progress shows up over months.
  const levelRank = new Map(ESL_LEVELS.map((level, index) => [level.id as string, index]))
  const levelLabel = new Map(ESL_LEVELS.map(level => [level.id as string, level.label]))
  const placementHistory = new Map<string, string[]>()
  for (const row of placements.rows) {
    const id = String(row.student_id)
    placementHistory.set(id, [...(placementHistory.get(id) ?? []), String(row.level)])
    if (inRange(String(row.date))) tutorTally(String(row.tutor_id)).placements++
  }

  const tracksById = new Map<string, Track[]>()
  for (const row of trackRows.rows) {
    const id = String(row.user_id)
    tracksById.set(id, [...(tracksById.get(id) ?? []), String(row.track) as Track])
  }
  const wordsById = new Map(vocab.rows.map(row => [String(row.user_id), Number(row.words)]))
  const firstLessonById = new Map(firstLessons.rows.map(row => [String(row.student_id), String(row.date)]))
  const lastSeenById = new Map<string, string>()
  for (const row of [...lastActivity.rows, ...lastAttendance.rows]) {
    const id = String(row.user_id ?? row.student_id)
    const date = String(row.date)
    if (date > (lastSeenById.get(id) ?? '')) lastSeenById.set(id, date)
  }

  const students: StudentProgress[] = studentRows.rows.map(row => {
    const id = String(row.id)
    const history = placementHistory.get(id) ?? []
    const first = history[0] ?? null
    const latest = history[history.length - 1] ?? null
    const tally = student.get(id)
    const tracks = (tracksById.get(id) ?? []).sort()
    const firstLesson = firstLessonById.get(id)
    return {
      id,
      name: String(row.name),
      tracks,
      firstLevel: first ? levelLabel.get(first) ?? first : null,
      currentLevel: latest ? levelLabel.get(latest) ?? latest : null,
      placements: history.length,
      movedUp: first !== null && latest !== null && (levelRank.get(latest) ?? 0) > (levelRank.get(first) ?? 0),
      placementDue: tracks.includes('esl') && history.length === 0 && firstLesson !== undefined
        && tracked(trackingSince.placements, firstLesson),
      lessonsAttended: tally?.lessons ?? 0,
      quizAverage: tally?.quiz.value ?? null,
      homeworkAssigned: tally?.homeworkAssigned ?? 0,
      homeworkDone: tally?.homeworkDone ?? 0,
      homePracticeDays: tally?.homeDays.size ?? 0,
      wordsMastered: wordsById.get(id) ?? 0,
      lastSeen: lastSeenById.get(id) ?? null,
    }
  })

  const eslStudents = students.filter(s => s.tracks.includes('esl'))
  const placedStudents = students.filter(s => s.placements > 0)
  const eslLevels: EslLevelSummary = {
    eslStudents: eslStudents.length,
    placed: placedStudents.length,
    retested: placedStudents.filter(s => s.placements > 1).length,
    movedUp: placedStudents.filter(s => s.movedUp).length,
  }

  const tutors: TutorUsage[] = tutorRows.rows
    .map(row => {
      const id = String(row.id)
      const tally = tutor.get(id)
      return {
        id,
        name: String(row.name),
        sessionDays: tally?.days.size ?? 0,
        lessonsTaught: tally?.lessons ?? 0,
        studentsTaught: tally?.students.size ?? 0,
        deckUseRate: ratio(tally?.deckUsed ?? 0, tally?.deckTracked ?? 0),
        averageDeckMinutes: tally?.deckMinutes.value ?? null,
        wrapUpRate: ratio(tally?.wrapUps ?? 0, tally?.wrapTracked ?? 0),
        homeworkAssignedRate: ratio(tally?.homeworkAssigned ?? 0, tally?.lessons ?? 0),
        averageRatingGiven: tally?.rating.value ?? null,
        placementsGiven: tally?.placements ?? 0,
        lastTaught: tally?.lastTaught ?? null,
      }
    })
    .sort((a, b) => b.lessonsTaught - a.lessonsTaught || b.sessionDays - a.sessionDays || a.name.localeCompare(b.name))

  const positions = new Map<Track, number>()
  const lessons: LessonFit[] = ALL_MODULES.map(module => {
    const position = (positions.get(module.track) ?? 0) + 1
    positions.set(module.track, position)
    const tally = lesson.get(module.slug)
    return {
      slug: module.slug,
      title: module.titleEn,
      track: module.track,
      position,
      classesTaught: tally?.classes.size ?? 0,
      studentsTaught: tally?.students ?? 0,
      averageDeckMinutes: tally?.deckMinutes.value ?? null,
      deckClasses: tally?.deckMinutes.n ?? 0,
      averageDeckReach: tally?.deckReach.value ?? null,
      finishedRate: ratio(tally?.finished ?? 0, tally?.wrapUps ?? 0),
      wrapUps: tally?.wrapUps ?? 0,
      commonStoppingPoint: mostCommon(tally?.stops ?? []),
      averageRating: tally?.rating.value ?? null,
      quizAverage: tally?.quiz.value ?? null,
      quizCount: tally?.quiz.n ?? 0,
      homeworkAverage: tally?.homework.value ?? null,
      homeworkCount: tally?.homework.n ?? 0,
    }
  })

  const quietStudents = students
    .filter(s => s.lastSeen === null || s.lastSeen <= quietSince)
    .map(s => ({ id: s.id, name: s.name, lastSeen: s.lastSeen, daysQuiet: s.lastSeen ? daysBetween(s.lastSeen, today) : null }))
    // Never seen first, then the longest quiet.
    .sort((a, b) => (b.daysQuiet ?? Infinity) - (a.daysQuiet ?? Infinity) || a.name.localeCompare(b.name))

  const current = weekStarts[weekStarts.length - 1]
  return {
    today,
    trackingSince,
    skippedWeeks,
    weeks: weekStarts.map(weekStart => ({
      weekStart,
      partial: weekStart === current,
      ...weekBuckets.get(weekStart)!.finish(),
    })),
    period: total.finish(),
    students,
    tutors,
    lessons,
    eslLevels,
    totalStudents: studentIds.size,
    quietStudents,
  }
}
