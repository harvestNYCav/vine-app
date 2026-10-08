import type { Client } from '@libsql/client'

// How far a tutor got through a lesson's slide deck on a given day, and roughly how long the deck
// was on screen. Keyed by tutor + date + lesson so it lines up with that day's `sessions` rows.
export const LESSON_DECK_PROGRESS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS lesson_deck_progress (
    tutor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    module_slug TEXT NOT NULL,
    furthest_slide INTEGER NOT NULL DEFAULT 0,
    furthest_section TEXT NOT NULL DEFAULT '',
    slide_count INTEGER NOT NULL,
    active_ms INTEGER NOT NULL DEFAULT 0,
    first_opened_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    PRIMARY KEY (tutor_id, date, module_slug)
  )
`

// The tutor's 30-second debrief for one scheduled lesson (one `sessions` row).
export const SESSION_WRAP_UPS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS session_wrap_ups (
    session_id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL,
    finished_lesson INTEGER NOT NULL CHECK(finished_lesson IN (0, 1)),
    stopped_at TEXT,
    quiz_score INTEGER,
    quiz_total INTEGER,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`

// One report should never claim more than this much on-screen time; anything longer is a laptop
// left open, not teaching.
export const MAX_ACTIVE_MS_PER_REPORT = 5 * 60_000

export interface DeckProgressReport {
  tutorId: string
  date: string
  moduleSlug: string
  slideIndex: number
  section: string
  slideCount: number
  activeMs: number
  now?: number
}

export async function recordDeckProgress(db: Client, report: DeckProgressReport): Promise<void> {
  const now = report.now ?? Date.now()
  const activeMs = Math.min(Math.max(0, Math.round(report.activeMs)), MAX_ACTIVE_MS_PER_REPORT)
  await db.execute({
    sql: `
      INSERT INTO lesson_deck_progress (
        tutor_id, date, module_slug, furthest_slide, furthest_section, slide_count, active_ms,
        first_opened_at, last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tutor_id, date, module_slug) DO UPDATE SET
        furthest_section = CASE
          WHEN excluded.furthest_slide > lesson_deck_progress.furthest_slide THEN excluded.furthest_section
          ELSE lesson_deck_progress.furthest_section
        END,
        furthest_slide = MAX(lesson_deck_progress.furthest_slide, excluded.furthest_slide),
        slide_count = excluded.slide_count,
        active_ms = lesson_deck_progress.active_ms + excluded.active_ms,
        last_seen_at = excluded.last_seen_at
    `,
    args: [
      report.tutorId, report.date, report.moduleSlug, report.slideIndex, report.section,
      report.slideCount, activeMs, now, now,
    ],
  })
}

export interface DeckProgress {
  tutorId: string
  moduleSlug: string
  furthestSlide: number
  furthestSection: string
  slideCount: number
  activeMs: number
}

// The furthest any tutor got in each lesson's deck on the given day.
export async function getDeckProgressForDate(db: Client, date: string, moduleSlugs: string[]): Promise<Map<string, DeckProgress>> {
  const progress = new Map<string, DeckProgress>()
  if (moduleSlugs.length === 0) return progress
  const result = await db.execute({
    sql: `
      SELECT * FROM lesson_deck_progress
      WHERE date = ? AND module_slug IN (${moduleSlugs.map(() => '?').join(',')})
      ORDER BY furthest_slide DESC
    `,
    args: [date, ...moduleSlugs],
  })
  for (const row of result.rows) {
    const moduleSlug = String(row.module_slug)
    if (progress.has(moduleSlug)) continue
    progress.set(moduleSlug, {
      tutorId: String(row.tutor_id),
      moduleSlug,
      furthestSlide: Number(row.furthest_slide),
      furthestSection: String(row.furthest_section),
      slideCount: Number(row.slide_count),
      activeMs: Number(row.active_ms),
    })
  }
  return progress
}

export interface SessionWrapUp {
  sessionId: string
  finishedLesson: boolean
  stoppedAt: string | null
  quizScore: number | null
  quizTotal: number | null
  rating: number
  note: string
  updatedAt: number
}

export type SessionWrapUpInput = Omit<SessionWrapUp, 'updatedAt'>

export class InvalidWrapUpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWrapUpError'
    Object.setPrototypeOf(this, InvalidWrapUpError.prototype)
  }
}

function optionalCount(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new InvalidWrapUpError(`${label} must be a whole number from 0 to 100.`)
  }
  return value
}

// Validates an untrusted request body into a wrap-up, throwing InvalidWrapUpError with a message
// fit to show the tutor.
export function parseSessionWrapUp(body: unknown): SessionWrapUpInput {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.sessionId !== 'string' || !input.sessionId) {
    throw new InvalidWrapUpError('Missing sessionId.')
  }
  if (typeof input.finishedLesson !== 'boolean') {
    throw new InvalidWrapUpError('Say whether you finished the lesson.')
  }
  if (typeof input.rating !== 'number' || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new InvalidWrapUpError('Pick a rating from 1 to 5.')
  }
  const quizScore = optionalCount(input.quizScore, 'Quiz score')
  const quizTotal = optionalCount(input.quizTotal, 'Quiz total')
  if (quizScore !== null && quizTotal !== null && quizScore > quizTotal) {
    throw new InvalidWrapUpError('Quiz score can\'t be more than the total.')
  }
  const stoppedAt = typeof input.stoppedAt === 'string' && input.stoppedAt.trim() && !input.finishedLesson
    ? input.stoppedAt.trim().slice(0, 100)
    : null
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 2000) : ''
  return {
    sessionId: input.sessionId,
    finishedLesson: input.finishedLesson,
    stoppedAt,
    quizScore,
    quizTotal: quizScore === null ? null : quizTotal,
    rating: input.rating,
    note,
  }
}

// Saves (or replaces) the wrap-up for an existing session. Returns false if there is no such session.
export async function saveSessionWrapUp(
  db: Client,
  tutorId: string,
  wrapUp: SessionWrapUpInput,
  now: number = Date.now(),
): Promise<boolean> {
  const result = await db.execute({
    sql: `
      INSERT INTO session_wrap_ups (
        session_id, tutor_id, finished_lesson, stopped_at, quiz_score, quiz_total, rating, note,
        created_at, updated_at
      )
      SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM sessions WHERE id = ?
      ON CONFLICT(session_id) DO UPDATE SET
        tutor_id = excluded.tutor_id,
        finished_lesson = excluded.finished_lesson,
        stopped_at = excluded.stopped_at,
        quiz_score = excluded.quiz_score,
        quiz_total = excluded.quiz_total,
        rating = excluded.rating,
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    args: [
      tutorId, wrapUp.finishedLesson ? 1 : 0, wrapUp.stoppedAt, wrapUp.quizScore, wrapUp.quizTotal,
      wrapUp.rating, wrapUp.note, now, now, wrapUp.sessionId,
    ],
  })
  return result.rowsAffected > 0
}

export async function getSessionWrapUps(db: Client, sessionIds: string[]): Promise<Map<string, SessionWrapUp>> {
  const wrapUps = new Map<string, SessionWrapUp>()
  if (sessionIds.length === 0) return wrapUps
  const result = await db.execute({
    sql: `SELECT * FROM session_wrap_ups WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
    args: sessionIds,
  })
  for (const row of result.rows) {
    wrapUps.set(String(row.session_id), {
      sessionId: String(row.session_id),
      finishedLesson: Number(row.finished_lesson) === 1,
      stoppedAt: row.stopped_at === null ? null : String(row.stopped_at),
      quizScore: row.quiz_score === null ? null : Number(row.quiz_score),
      quizTotal: row.quiz_total === null ? null : Number(row.quiz_total),
      rating: Number(row.rating),
      note: String(row.note),
      updatedAt: Number(row.updated_at),
    })
  }
  return wrapUps
}

export const SESSION_METRICS_CSV_COLUMNS = [
  'date', 'student', 'tutor', 'lesson', 'present', 'homework_assigned', 'homework_completed',
  'homework_score', 'deck_furthest_slide', 'deck_slide_count', 'deck_furthest_section',
  'deck_minutes', 'finished_lesson', 'stopped_at', 'quiz_score', 'quiz_total', 'rating', 'note',
] as const

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// One row per scheduled lesson, joining everything recorded about it, for the pilot analysis.
export async function buildSessionMetricsCsv(db: Client): Promise<string> {
  const result = await db.execute({
    sql: `
      SELECT
        s.date,
        student.name AS student,
        tutor.name AS tutor,
        s.module_slug AS lesson,
        a.present,
        s.homework_assigned,
        mp.homework_completed_at,
        mp.homework_score,
        dp.furthest_slide,
        dp.slide_count,
        dp.furthest_section,
        dp.active_ms,
        w.finished_lesson,
        w.stopped_at,
        w.quiz_score,
        w.quiz_total,
        w.rating,
        w.note
      FROM sessions s
      LEFT JOIN users student ON student.id = s.student_id
      LEFT JOIN users tutor ON tutor.id = s.tutor_id
      LEFT JOIN attendance a ON a.session_date = s.date AND a.student_id = s.student_id
      LEFT JOIN module_progress mp ON mp.user_id = s.student_id AND mp.module_slug = s.module_slug
      LEFT JOIN lesson_deck_progress dp
        ON dp.tutor_id = s.tutor_id AND dp.date = s.date AND dp.module_slug = s.module_slug
      LEFT JOIN session_wrap_ups w ON w.session_id = s.id
      ORDER BY s.date, student.name, s.created_at
    `,
    args: [],
  })
  const yesNo = (value: unknown) => value === null || value === undefined ? '' : Number(value) === 1 ? 'yes' : 'no'
  const lines = result.rows.map(row => [
    row.date,
    row.student,
    row.tutor,
    row.lesson,
    yesNo(row.present),
    yesNo(row.homework_assigned),
    row.homework_completed_at ? 'yes' : 'no',
    row.homework_score,
    row.furthest_slide === null ? null : Number(row.furthest_slide) + 1,
    row.slide_count,
    row.furthest_section,
    row.active_ms === null ? null : Math.round(Number(row.active_ms) / 60_000),
    yesNo(row.finished_lesson),
    row.stopped_at,
    row.quiz_score,
    row.quiz_total,
    row.rating,
    row.note,
  ].map(csvCell).join(','))
  return [SESSION_METRICS_CSV_COLUMNS.join(','), ...lines].join('\n') + '\n'
}
