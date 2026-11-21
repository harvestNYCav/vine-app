import type { Client } from '@libsql/client'
import { ALL_MODULES } from '@/content/modules'
import { ESL_LEVELS } from '@/content/esl-placement'
import type { Track } from '@/types'
import { localDateKey } from './dates'
import { isPaused, pauseStateFromRow } from './account-visibility'

// The admin Impact page: is Vine doing what it was built for? Tutors teach in-person lessons from
// it, students practice between sessions, and students learn. Everything here is derived from
// tables that already exist; nothing new is recorded. Weeks run Monday–Sunday in the program time
// zone, keyed by their Monday as a `YYYY-MM-DD` string.
//
// Only Vine session weeks count: the weeks holding one of `VINE_SESSION_DATES`. Other weeks (a
// holiday, a retreat, tutoring that didn't use Vine) would otherwise show as dips or noise, so they
// are left out of the trends and the totals alike.
//
// The page looks at one session week at a time (the "focus"), or at all of them together. Trends
// always cover every session week; everything else (tiles, tables, drill-down lists) covers the
// focus.

// In-person Vine sessions this term (Saturdays). Dates not listed were skipped for holidays and
// events. Add next term's dates here.
export const VINE_SESSION_DATES: readonly string[] = [
  '2026-10-24', '2026-11-07', '2026-11-14', '2026-11-21', '2026-12-05', '2026-12-12', '2026-12-19',
]

// A student who has missed this many Vine sessions in a row is listed as one to check in on.
export const MISSED_SESSIONS_TO_CHECK_IN = 2
// The in-person session the lessons are written to fill.
export const SESSION_MINUTES = 120

const DAY_MS = 86_400_000

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

export interface SessionWeek {
  weekStart: string
  sessionDate: string
}

// The session weeks to report on, oldest first: every week up to and including the current one that
// holds a session date. Also returns the weeks skipped between the first session and now, and the
// session dates still to come after this week.
export function sessionWeeks(
  today: string,
  sessionDates: Iterable<string>,
): { weeks: SessionWeek[]; skipped: string[]; upcoming: string[] } {
  const current = weekStartOf(today)
  const byWeek = new Map<string, string>()
  const upcoming: string[] = []
  for (const date of [...new Set(sessionDates)].sort()) {
    const week = weekStartOf(date)
    if (week > current) upcoming.push(date)
    else if (!byWeek.has(week)) byWeek.set(week, date)
  }
  const weeks = [...byWeek].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, sessionDate]) => ({ weekStart, sessionDate }))
  const skipped: string[] = []
  if (weeks.length) {
    for (let week = weeks[0].weekStart; week < current; week = addDays(week, 7)) {
      if (!byWeek.has(week)) skipped.push(week)
    }
  }
  return { weeks, skipped, upcoming }
}

// Which session week to focus on: a session date from the URL, "all", or by default the most recent
// session that has happened (or this week's, if none has yet).
export function resolveFocus(value: unknown, weeks: SessionWeek[], today: string): SessionWeek | null {
  if (value === 'all' || weeks.length === 0) return null
  const asked = typeof value === 'string' ? weeks.find(week => week.sessionDate === value) : undefined
  if (asked) return asked
  return [...weeks].reverse().find(week => week.sessionDate <= today) ?? weeks[weeks.length - 1]
}

const ratio = (part: number, whole: number) => whole > 0 ? part / whole : null

class Mean {
  sum = 0
  n = 0
  add(value: number) { this.sum += value; this.n++ }
  get value(): number | null { return this.n > 0 ? this.sum / this.n : null }
}

// Figures for one week, or for the whole focus.
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
  // Lessons after hand-off notes began, how many left a note for the student's next tutor, and the share.
  handoffTrackedLessons: number
  handoffLessons: number
  handoffRate: number | null
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
  sessionDate: string
  // True for the week containing today, whose numbers are still growing.
  partial: boolean
}

export interface StudentProgress {
  id: string
  name: string
  tracks: Track[]
  // Tutors the admin has paired the student with.
  tutorNames: string[]
  // ESL placement levels (labels): the first test and the latest. Null if never placed.
  firstLevel: string | null
  currentLevel: string | null
  placements: number
  movedUp: boolean
  // An ESL student whose first lesson came after the placement test existed, with no placement yet.
  // Never a paused student: they can't be tested until they are back.
  placementDue: boolean
  // The rest are for the focus, except words mastered and last seen, which are all-time.
  lessonsAttended: number
  // Days marked present and marked at all.
  daysPresent: number
  daysMarked: number
  activeDays: number
  quizAverage: number | null
  homeworkAssigned: number
  homeworkDone: number
  homePracticeDays: number
  wordsMastered: number
  lastSeen: string | null
  // Paused today (lib/account-visibility.ts). A paused student is listed only when they took part
  // in the focus, so the lists match the tile numbers, and never as one to check in on.
  paused: boolean
}

export interface TutorUsage {
  id: string
  name: string
  sessionDays: number
  lessonsTaught: number
  studentsTaught: number
  studentNames: string[]
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

// One scheduled lesson that was taught in the focus, with everything the rates are built from, so
// the page can show exactly which lessons are behind each percentage.
export interface TaughtLesson {
  sessionId: string
  date: string
  studentId: string
  studentName: string
  tutorId: string
  tutorName: string
  slug: string
  title: string
  // Present, or not marked either way (absent lessons are not taught).
  markedPresent: boolean
  // 'untracked' for lessons before slide (or wrap-up) tracking began.
  deck: 'used' | 'unused' | 'untracked'
  // Tutors who opened this lesson's slides that day, and the minutes the deck was on screen.
  deckOpenedBy: string[]
  deckMinutes: number | null
  wrapUp: 'filed' | 'missing' | 'untracked'
  // Whether the wrap-up left a note for the student's next tutor.
  handoff: 'left' | 'none' | 'untracked'
  handoffNote: string | null
  finished: boolean | null
  stoppedAt: string | null
  rating: number | null
  note: string | null
  homeworkAssigned: boolean
  // The day the student finished the homework, if on or after the lesson.
  homeworkDoneOn: string | null
}

// A lesson quiz or homework score submitted in the focus (each student's latest attempt).
export interface ScoreRecord {
  studentId: string
  studentName: string
  slug: string
  title: string
  date: string
  score: number
}

export interface ExamRecord {
  studentId: string
  studentName: string
  subject: 'Math' | 'ELA'
  examId: string
  section: string
  date: string
  score: number
}

// A tutor opening a lesson's slides on one day.
export interface DeckSession {
  tutorId: string
  tutorName: string
  date: string
  slug: string
  title: string
  minutes: number
  reach: number | null
  // False when no student had this lesson scheduled that day: a preview, or a lesson taught without
  // being assigned in Vine.
  scheduled: boolean
}

export interface PlacementRecord {
  studentId: string
  studentName: string
  tutorName: string
  date: string
  level: string
}

export interface CheckInStudent {
  id: string
  name: string
  tracks: Track[]
  tutorNames: string[]
  // The most recent day with practice or attendance, or null if there has never been any.
  lastSeen: string | null
  // Past Vine sessions since they were last seen.
  sessionsMissed: number
  // Lessons taught to them at Vine sessions, all time.
  vineLessons: number
  // Came to Vine sessions, then stopped (most worth a call); quiet since before Vine sessions
  // began; or never used Vine at all.
  group: 'stopped' | 'before-sessions' | 'never'
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
  handoffs: string | null
  placements: string | null
}

export interface ProgramImpact {
  today: string
  trackingSince: TrackingSince
  // Session weeks only (see the note at the top); the last may be the current week.
  weeks: WeeklyMetrics[]
  // The focused session week, or null for all of them.
  focus: SessionWeek | null
  // Weeks with no Vine session between the first session and now, and sessions still to come.
  skippedWeeks: string[]
  upcomingSessions: string[]
  period: PeriodMetrics
  students: StudentProgress[]
  tutors: TutorUsage[]
  lessons: LessonFit[]
  taughtLessons: TaughtLesson[]
  quizScores: ScoreRecord[]
  homeworkScores: ScoreRecord[]
  examScores: ExamRecord[]
  deckSessions: DeckSession[]
  // All-time, newest first.
  placementRecords: PlacementRecord[]
  eslLevels: EslLevelSummary
  // Real students who are not paused.
  totalStudents: number
  testAccounts: number
  pausedStudents: number
  checkIn: CheckInStudent[]
}

// Accumulates the raw counts for one bucket (a week, or the whole focus).
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
  handoffTracked = 0
  handoffs = 0
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
      handoffTrackedLessons: this.handoffTracked,
      handoffLessons: this.handoffs,
      handoffRate: ratio(this.handoffs, this.handoffTracked),
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

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export async function getProgramImpact(
  db: Client,
  options: {
    today: string
    // A session date, 'all', or undefined for the most recent session.
    focus?: string
    sessionDates?: readonly string[]
    now?: number
    timeZone?: string
  },
): Promise<ProgramImpact> {
  const { today } = options
  const now = options.now ?? Date.now()
  const toKey = (ms: number) => localDateKey(ms, options.timeZone)
  const { weeks: sessionWeekList, skipped: skippedWeeks, upcoming: upcomingSessions } =
    sessionWeeks(today, options.sessionDates ?? VINE_SESSION_DATES)
  const focus = resolveFocus(options.focus, sessionWeekList, today)
  const weekStarts = sessionWeekList.map(week => week.weekStart)
  const reportedWeeks = new Set(weekStarts)
  const pastSessions = sessionWeekList.map(week => week.sessionDate).filter(date => date <= today)
  // With no session weeks yet, query an empty range.
  const firstDay = weekStarts[0] ?? today
  const lastDay = weekStarts.length ? addDays(weekStarts[weekStarts.length - 1], 6) : addDays(today, -1)
  // Timestamps are bucketed by their program-local date, so fetch a day of slack on either side of
  // the UTC range and let the date-key check decide.
  const sinceMs = now - (Math.max(0, daysBetween(firstDay, today)) + 2) * DAY_MS
  // Inside a session week; days in other weeks count for nothing.
  const inRange = (date: string) => date >= firstDay && date <= lastDay && reportedWeeks.has(weekStartOf(date))
  // Inside the focused week (or any session week when looking at all of them).
  const inFocus = (date: string) => inRange(date) && (focus === null || weekStartOf(date) === focus.weekStart)

  const [
    userRows, trackRows, pairingRows, activity, sessions, attendance, checkIns, wrapUps, handoffs, deck,
    progress, mathExams, elaExams, placements, vocab, lastActivity, lastAttendance, firstLessons, vineLessons, since,
  ] = await Promise.all([
    db.execute({
      sql: "SELECT id, name, role, is_test, paused_on, paused_until FROM users WHERE role IN ('student', 'tutor') ORDER BY name",
      args: [],
    }),
    db.execute({ sql: 'SELECT user_id, track FROM user_tracks', args: [] }),
    db.execute({ sql: 'SELECT student_id, tutor_id FROM student_tutors', args: [] }),
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
      sql: `SELECT w.session_id, w.tutor_id, w.rating, w.finished_lesson, w.stopped_at, w.note FROM session_wrap_ups w
            JOIN sessions s ON s.id = w.session_id WHERE s.date BETWEEN ? AND ?`,
      args: [firstDay, lastDay],
    }),
    db.execute({
      sql: `SELECT n.session_id, n.body FROM tutor_notes n
            JOIN sessions s ON s.id = n.session_id WHERE s.date BETWEEN ? AND ?`,
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
      sql: `SELECT user_id, exam_id, section_slug, finished_at, points_earned, points_possible
            FROM math_exam_attempts WHERE finished_at >= ?`,
      args: [sinceMs],
    }),
    db.execute({
      sql: `SELECT user_id, exam_id, section_slug, finished_at, points_earned, points_possible
            FROM ela_exam_attempts WHERE finished_at >= ?`,
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
    // Lessons at past Vine sessions (not marked absent), all time, for the check-in list.
    db.execute({
      sql: `SELECT s.student_id, s.date FROM sessions s
            LEFT JOIN attendance a ON a.student_id = s.student_id AND a.session_date = s.date
            WHERE (a.present IS NULL OR a.present = 1) AND s.date <= ?`,
      args: [today],
    }),
    db.execute({
      sql: `SELECT
              (SELECT MIN(date) FROM lesson_deck_progress) AS deck,
              (SELECT MIN(s.date) FROM session_wrap_ups w JOIN sessions s ON s.id = w.session_id) AS wrap_ups,
              (SELECT MIN(s.date) FROM tutor_notes n JOIN sessions s ON s.id = n.session_id) AS handoffs,
              (SELECT MIN(date) FROM esl_placements) AS placements`,
      args: [],
    }),
  ])

  const sinceRow = since.rows[0]
  const sinceValue = (value: unknown) => value === null || value === undefined ? null : String(value)
  const trackingSince: TrackingSince = {
    deck: sinceValue(sinceRow?.deck),
    wrapUps: sinceValue(sinceRow?.wrap_ups),
    handoffs: sinceValue(sinceRow?.handoffs),
    placements: sinceValue(sinceRow?.placements),
  }
  const tracked = (since: string | null, date: string) => since !== null && date >= since

  // Test accounts (lib/account-visibility.ts) are dropped here, so nothing below ever counts them.
  // Students paused today are kept: what they did before the pause still counts. They are only left
  // off the student lists when they did nothing in the focus (see `students` below).
  const names = new Map<string, string>()
  const studentRows: Array<{ id: string; name: string; paused: boolean }> = []
  const tutorRows: Array<{ id: string; name: string }> = []
  const studentIds = new Set<string>()
  const testIds = new Set<string>()
  let pausedStudents = 0
  for (const row of userRows.rows) {
    const name = String(row.name)
    const id = String(row.id)
    if (Number(row.is_test) === 1) { testIds.add(id); continue }
    names.set(id, name)
    if (row.role !== 'student') { tutorRows.push({ id, name }); continue }
    studentIds.add(id)
    const paused = isPaused(pauseStateFromRow(row), today)
    if (paused) pausedStudents++
    studentRows.push({ id, name, paused })
  }
  const tutorIds = new Set(tutorRows.map(row => row.id))
  const nameOf = (id: string) => names.get(id) ?? 'Unknown'
  const lessonTitle = new Map(ALL_MODULES.map(module => [module.slug, module.titleEn]))
  const titleOf = (slug: string) => lessonTitle.get(slug) ?? slug

  const weekBuckets = new Map(weekStarts.map(start => [start, new Bucket()]))
  const total = new Bucket()
  // Each fact counts toward its week, and toward the total when it falls in the focus.
  const bucketsFor = (date: string | null): Bucket[] => {
    if (!date || !inRange(date)) return []
    const week = weekBuckets.get(weekStartOf(date))
    if (!week) return []
    return inFocus(date) ? [week, total] : [week]
  }

  // Per-student, per-tutor and per-lesson tallies for the focus.
  const student = new Map<string, {
    lessons: number; quiz: Mean; homeworkAssigned: number; homeworkDone: number; homeDays: Set<string>
    activeDays: Set<string>; present: number; marked: number
  }>()
  const studentTally = (id: string) => {
    let tally = student.get(id)
    if (!tally) {
      tally = {
        lessons: 0, quiz: new Mean(), homeworkAssigned: 0, homeworkDone: 0, homeDays: new Set(),
        activeDays: new Set(), present: 0, marked: 0,
      }
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
    const id = String(row.student_id)
    if (!studentIds.has(id)) continue
    const date = String(row.date)
    const present = Number(row.present) === 1
    marks.set(`${id}:${date}`, present)
    for (const bucket of bucketsFor(date)) {
      bucket.attendanceMarked++
      if (present) bucket.attendancePresent++
    }
    if (inFocus(date)) {
      const tally = studentTally(id)
      tally.marked++
      if (present) tally.present++
    }
  }
  for (const row of checkIns.rows) {
    const date = String(row.date)
    const id = String(row.tutor_id)
    if (!tutorIds.has(id)) continue
    for (const bucket of bucketsFor(date)) bucket.tutors.add(id)
    if (inFocus(date)) tutorTally(id).days.add(date)
  }

  // Which lessons were scheduled on which days, for telling a class from a preview.
  const scheduled = new Set(sessions.rows.map(row => `${row.date}:${row.module_slug}`))

  // A deck counts as used for a lesson if any tutor opened that lesson's deck that day.
  const deckOpened = new Map<string, Array<{ tutorId: string; minutes: number }>>()
  const deckSessions: DeckSession[] = []
  for (const row of deck.rows) {
    const tutorId = String(row.tutor_id)
    if (!tutorIds.has(tutorId)) continue
    const slug = String(row.module_slug)
    const date = String(row.date)
    const minutes = Number(row.active_ms) / 60_000
    push(deckOpened, `${date}:${slug}`, { tutorId, minutes })
    if (!inFocus(date)) continue
    const slideCount = Number(row.slide_count)
    const reach = slideCount > 0 ? Math.min(1, (Number(row.furthest_slide) + 1) / slideCount) : null
    tutorTally(tutorId).deckMinutes.add(minutes)
    const tally = lessonTally(slug)
    tally.deckMinutes.add(minutes)
    if (reach !== null) tally.deckReach.add(reach)
    deckSessions.push({
      tutorId, tutorName: nameOf(tutorId), date, slug, title: titleOf(slug), minutes, reach,
      scheduled: scheduled.has(`${date}:${slug}`),
    })
  }

  const wrapUpBySession = new Map(wrapUps.rows.map(row => [String(row.session_id), row]))
  const handoffBySession = new Map(handoffs.rows.map(row => [String(row.session_id), String(row.body)]))
  const homeworkDoneAt = new Map<string, string>()
  for (const row of progress.rows) {
    if (row.homework_completed_at !== null) {
      homeworkDoneAt.set(`${row.user_id}:${row.module_slug}`, toKey(Number(row.homework_completed_at)))
    }
  }

  const sessionDays = new Set<string>()
  const taughtLessons: TaughtLesson[] = []
  for (const row of sessions.rows) {
    const date = String(row.date)
    const studentId = String(row.student_id)
    const tutorId = String(row.tutor_id)
    const slug = String(row.module_slug)
    if (!studentIds.has(studentId) || testIds.has(tutorId)) continue
    sessionDays.add(`${studentId}:${date}`)
    if (!inRange(date) || date > today || marks.get(`${studentId}:${date}`) === false) continue

    const deckTracked = tracked(trackingSince.deck, date)
    const wrapTracked = tracked(trackingSince.wrapUps, date)
    const openings = deckOpened.get(`${date}:${slug}`) ?? []
    const deckUsed = openings.length > 0
    const wrapUp = wrapUpBySession.get(String(row.id))
    // Hand-offs are written in the wrap-up, so only lessons after both began can have one.
    const handoffTracked = wrapTracked && tracked(trackingSince.handoffs, date)
    const handoffNote = handoffBySession.get(String(row.id)) ?? null
    const homeworkAssigned = Number(row.homework_assigned) === 1
    const doneOn = homeworkDoneAt.get(`${studentId}:${slug}`)
    const homeworkDone = homeworkAssigned && doneOn !== undefined && doneOn >= date
    for (const bucket of bucketsFor(date)) {
      bucket.lessonsTaught++
      if (deckTracked) bucket.deckTracked++
      if (deckUsed) bucket.deckUsed++
      if (wrapTracked) bucket.wrapTracked++
      if (wrapUp) bucket.wrapUps++
      if (handoffTracked) bucket.handoffTracked++
      if (handoffTracked && handoffNote) bucket.handoffs++
      if (homeworkAssigned) bucket.homeworkAssigned++
      if (homeworkDone) bucket.homeworkDone++
    }
    if (!inFocus(date)) continue

    taughtLessons.push({
      sessionId: String(row.id),
      date,
      studentId,
      studentName: nameOf(studentId),
      tutorId,
      tutorName: nameOf(tutorId),
      slug,
      title: titleOf(slug),
      markedPresent: marks.get(`${studentId}:${date}`) === true,
      deck: deckUsed ? 'used' : deckTracked ? 'unused' : 'untracked',
      deckOpenedBy: [...new Set(openings.map(opening => nameOf(opening.tutorId)))],
      deckMinutes: deckUsed ? Math.max(...openings.map(opening => opening.minutes)) : null,
      wrapUp: wrapUp ? 'filed' : wrapTracked ? 'missing' : 'untracked',
      finished: wrapUp ? Number(wrapUp.finished_lesson) === 1 : null,
      stoppedAt: wrapUp?.stopped_at ? String(wrapUp.stopped_at) : null,
      rating: wrapUp ? Number(wrapUp.rating) : null,
      note: wrapUp?.note ? String(wrapUp.note) : null,
      handoff: handoffNote ? 'left' : handoffTracked ? 'none' : 'untracked',
      handoffNote,
      homeworkAssigned,
      homeworkDoneOn: homeworkDone ? doneOn! : null,
    })

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
    if (!studentIds.has(id)) continue
    const atHome = !sessionDays.has(`${id}:${date}`)
    for (const bucket of bucketsFor(date)) {
      bucket.active.add(id)
      if (atHome) bucket.homePractice.add(id)
    }
    if (inFocus(date)) {
      const tally = studentTally(id)
      tally.activeDays.add(date)
      if (atHome) tally.homeDays.add(date)
    }
  }

  const quizScores: ScoreRecord[] = []
  const homeworkScores: ScoreRecord[] = []
  for (const row of progress.rows) {
    const id = String(row.user_id)
    if (!studentIds.has(id)) continue
    const slug = String(row.module_slug)
    const record = (completedAt: unknown, score: number): ScoreRecord => ({
      studentId: id, studentName: nameOf(id), slug, title: titleOf(slug), date: toKey(Number(completedAt)), score,
    })
    if (row.practice_completed_at !== null && row.practice_score !== null) {
      const date = toKey(Number(row.practice_completed_at))
      const score = Number(row.practice_score) / 100
      for (const bucket of bucketsFor(date)) bucket.quiz.add(score)
      if (inFocus(date)) {
        lessonTally(slug).quiz.add(score)
        studentTally(id).quiz.add(score)
        quizScores.push(record(row.practice_completed_at, score))
      }
    }
    if (row.homework_completed_at !== null && row.homework_score !== null) {
      const date = toKey(Number(row.homework_completed_at))
      const score = Number(row.homework_score) / 100
      for (const bucket of bucketsFor(date)) bucket.homework.add(score)
      if (inFocus(date)) {
        lessonTally(slug).homework.add(score)
        homeworkScores.push(record(row.homework_completed_at, score))
      }
    }
  }

  const examScores: ExamRecord[] = []
  for (const [subject, rows] of [['Math', mathExams.rows], ['ELA', elaExams.rows]] as const) {
    for (const row of rows) {
      const id = String(row.user_id)
      const possible = Number(row.points_possible ?? 0)
      if (!studentIds.has(id) || possible <= 0) continue
      const date = toKey(Number(row.finished_at))
      const score = Number(row.points_earned ?? 0) / possible
      for (const bucket of bucketsFor(date)) bucket.exam.add(score)
      if (inFocus(date)) {
        examScores.push({
          studentId: id, studentName: nameOf(id), subject, examId: String(row.exam_id ?? ''),
          section: String(row.section_slug ?? ''), date, score,
        })
      }
    }
  }

  // ESL levels across the whole program, not just the focus: progress shows up over months.
  const levelRank = new Map(ESL_LEVELS.map((level, index) => [level.id as string, index]))
  const levelLabel = new Map(ESL_LEVELS.map(level => [level.id as string, level.label]))
  const placementHistory = new Map<string, string[]>()
  const placementRecords: PlacementRecord[] = []
  for (const row of placements.rows) {
    const id = String(row.student_id)
    if (!studentIds.has(id)) continue
    const level = String(row.level)
    push(placementHistory, id, level)
    const tutorId = String(row.tutor_id)
    placementRecords.push({
      studentId: id, studentName: nameOf(id), tutorName: nameOf(tutorId), date: String(row.date),
      level: levelLabel.get(level) ?? level,
    })
    if (inFocus(String(row.date)) && tutorIds.has(tutorId)) tutorTally(tutorId).placements++
  }
  placementRecords.reverse()

  const tracksById = new Map<string, Track[]>()
  for (const row of trackRows.rows) push(tracksById, String(row.user_id), String(row.track) as Track)
  const tutorNamesById = new Map<string, string[]>()
  for (const row of pairingRows.rows) {
    const tutorId = String(row.tutor_id)
    if (tutorIds.has(tutorId)) push(tutorNamesById, String(row.student_id), nameOf(tutorId))
  }
  const wordsById = new Map(vocab.rows.map(row => [String(row.user_id), Number(row.words)]))
  const firstLessonById = new Map(firstLessons.rows.map(row => [String(row.student_id), String(row.date)]))
  const lastSeenById = new Map<string, string>()
  for (const row of [...lastActivity.rows, ...lastAttendance.rows]) {
    const id = String(row.user_id ?? row.student_id)
    const date = String(row.date)
    if (date > (lastSeenById.get(id) ?? '')) lastSeenById.set(id, date)
  }

  // A student tally exists only for students who took part in the focus (a lesson, a mark, practice
  // or a quiz), the same facts the tile numbers count.
  const students: StudentProgress[] = studentRows.filter(({ id, paused }) => !paused || student.has(id)).map(({ id, name, paused }) => {
    const history = placementHistory.get(id) ?? []
    const first = history[0] ?? null
    const latest = history[history.length - 1] ?? null
    const tally = student.get(id)
    const tracks = (tracksById.get(id) ?? []).sort()
    const firstLesson = firstLessonById.get(id)
    return {
      id,
      name,
      tracks,
      tutorNames: (tutorNamesById.get(id) ?? []).sort(),
      firstLevel: first ? levelLabel.get(first) ?? first : null,
      currentLevel: latest ? levelLabel.get(latest) ?? latest : null,
      placements: history.length,
      movedUp: first !== null && latest !== null && (levelRank.get(latest) ?? 0) > (levelRank.get(first) ?? 0),
      placementDue: !paused && tracks.includes('esl') && history.length === 0 && firstLesson !== undefined
        && tracked(trackingSince.placements, firstLesson),
      lessonsAttended: tally?.lessons ?? 0,
      daysPresent: tally?.present ?? 0,
      daysMarked: tally?.marked ?? 0,
      activeDays: tally?.activeDays.size ?? 0,
      quizAverage: tally?.quiz.value ?? null,
      homeworkAssigned: tally?.homeworkAssigned ?? 0,
      homeworkDone: tally?.homeworkDone ?? 0,
      homePracticeDays: tally?.homeDays.size ?? 0,
      wordsMastered: wordsById.get(id) ?? 0,
      lastSeen: lastSeenById.get(id) ?? null,
      paused,
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

  const tutors: TutorUsage[] = tutorRows
    .map(({ id, name }) => {
      const tally = tutor.get(id)
      return {
        id,
        name,
        sessionDays: tally?.days.size ?? 0,
        lessonsTaught: tally?.lessons ?? 0,
        studentsTaught: tally?.students.size ?? 0,
        studentNames: [...(tally?.students ?? [])].map(nameOf).sort(),
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

  // Who to check in on is about now, not the focus: students who have missed the last few Vine
  // sessions, or never come at all.
  const vineLessonsById = new Map<string, number>()
  const pastSessionSet = new Set(pastSessions)
  for (const row of vineLessons.rows) {
    if (!pastSessionSet.has(String(row.date))) continue
    const id = String(row.student_id)
    vineLessonsById.set(id, (vineLessonsById.get(id) ?? 0) + 1)
  }
  const firstSession = pastSessions[0]
  const checkIn: CheckInStudent[] = students
    // A paused student is away on purpose; nobody needs to call them.
    .filter(s => !s.paused)
    .map(s => {
      const sessionsMissed = pastSessions.filter(date => s.lastSeen === null || date > s.lastSeen).length
      const group: CheckInStudent['group'] = s.lastSeen === null ? 'never'
        : firstSession === undefined || s.lastSeen < firstSession ? 'before-sessions' : 'stopped'
      return {
        id: s.id, name: s.name, tracks: s.tracks, tutorNames: s.tutorNames, lastSeen: s.lastSeen,
        sessionsMissed, vineLessons: vineLessonsById.get(s.id) ?? 0, group,
      }
    })
    .filter(s => s.sessionsMissed >= MISSED_SESSIONS_TO_CHECK_IN || (s.group !== 'stopped' && pastSessions.length > 0))
    // Most recently seen first: the freshest drop-offs are the easiest to bring back.
    .sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? '') || a.name.localeCompare(b.name))

  const byLessonOrder = (a: { date: string; tutorName: string; title: string }, b: typeof a) =>
    a.date.localeCompare(b.date) || a.tutorName.localeCompare(b.tutorName) || a.title.localeCompare(b.title)
  const byDateThenName = (a: { date: string; studentName: string }, b: typeof a) =>
    a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName)

  return {
    today,
    trackingSince,
    focus,
    skippedWeeks,
    upcomingSessions,
    weeks: sessionWeekList.map(({ weekStart, sessionDate }) => ({
      weekStart,
      sessionDate,
      partial: weekStart === weekStartOf(today),
      ...weekBuckets.get(weekStart)!.finish(),
    })),
    period: total.finish(),
    students,
    tutors,
    lessons,
    taughtLessons: taughtLessons.sort((a, b) => byLessonOrder(a, b) || a.studentName.localeCompare(b.studentName)),
    quizScores: quizScores.sort(byDateThenName),
    homeworkScores: homeworkScores.sort(byDateThenName),
    examScores: examScores.sort(byDateThenName),
    deckSessions: deckSessions.sort(byLessonOrder),
    placementRecords,
    eslLevels,
    totalStudents: studentRows.filter(row => !row.paused).length,
    testAccounts: testIds.size,
    pausedStudents,
    checkIn,
  }
}
