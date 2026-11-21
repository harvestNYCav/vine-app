import { randomUUID } from 'crypto'
import type { Client } from '@libsql/client'

// Notes one tutor leaves for whoever tutors the student next. A note written from a session
// wrap-up carries that session's id, so editing the wrap-up updates the note instead of adding
// another; notes added from the Tutor Notes card have no session.
export const TUTOR_NOTES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tutor_notes (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    tutor_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    session_id TEXT
  )
`

export const MAX_HANDOFF_NOTE_LENGTH = 2000

export function parseHandoffNote(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_HANDOFF_NOTE_LENGTH) : ''
}

// Saves, replaces or (when the body is empty) removes the hand-off note for one session.
export async function saveSessionHandoffNote(
  db: Client,
  tutorId: string,
  sessionId: string,
  body: string,
  now: number = Date.now(),
): Promise<void> {
  const existing = await db.execute({ sql: 'SELECT id FROM tutor_notes WHERE session_id = ?', args: [sessionId] })
  const existingId = existing.rows[0] ? String(existing.rows[0].id) : null
  if (!body) {
    if (existingId) await db.execute({ sql: 'DELETE FROM tutor_notes WHERE id = ?', args: [existingId] })
    return
  }
  if (existingId) {
    await db.execute({ sql: 'UPDATE tutor_notes SET body = ?, tutor_id = ? WHERE id = ?', args: [body, tutorId, existingId] })
    return
  }
  await db.execute({
    sql: `INSERT INTO tutor_notes (id, student_id, tutor_id, body, created_at, session_id)
          SELECT ?, student_id, ?, ?, ?, id FROM sessions WHERE id = ?`,
    args: [randomUUID(), tutorId, body, now, sessionId],
  })
}

export async function getSessionHandoffNotes(db: Client, sessionIds: string[]): Promise<Map<string, string>> {
  const notes = new Map<string, string>()
  if (sessionIds.length === 0) return notes
  const result = await db.execute({
    sql: `SELECT session_id, body FROM tutor_notes WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
    args: sessionIds,
  })
  for (const row of result.rows) notes.set(String(row.session_id), String(row.body))
  return notes
}

export interface PreviousLessonWrapUp {
  moduleSlug: string
  finishedLesson: boolean
  stoppedAt: string | null
  note: string
}

export interface StudentHandoff {
  // The latest note for the next tutor, ignoring hand-offs written from today's sessions.
  note: { body: string; tutorName: string; createdAt: number } | null
  // Wrap-ups from the student's most recent session day before today.
  lastSession: { date: string; tutorName: string | null; lessons: PreviousLessonWrapUp[] } | null
}

export async function getStudentHandoff(db: Client, studentId: string, today: string): Promise<StudentHandoff> {
  const [noteResult, wrapUpResult] = await Promise.all([
    db.execute({
      sql: `SELECT n.body, n.created_at, u.name AS tutor_name
            FROM tutor_notes n
            JOIN users u ON u.id = n.tutor_id
            LEFT JOIN sessions s ON s.id = n.session_id
            WHERE n.student_id = ? AND (s.date IS NULL OR s.date < ?)
            ORDER BY n.created_at DESC
            LIMIT 1`,
      args: [studentId, today],
    }),
    db.execute({
      sql: `SELECT s.date, s.module_slug, w.finished_lesson, w.stopped_at, w.note, u.name AS tutor_name
            FROM session_wrap_ups w
            JOIN sessions s ON s.id = w.session_id
            LEFT JOIN users u ON u.id = w.tutor_id
            WHERE s.student_id = ?
              AND s.date = (
                SELECT MAX(s2.date) FROM session_wrap_ups w2 JOIN sessions s2 ON s2.id = w2.session_id
                WHERE s2.student_id = ? AND s2.date < ?
              )
            ORDER BY s.created_at, s.id`,
      args: [studentId, studentId, today],
    }),
  ])

  const noteRow = noteResult.rows[0]
  const note = noteRow
    ? { body: String(noteRow.body), tutorName: String(noteRow.tutor_name), createdAt: Number(noteRow.created_at) }
    : null

  const wrapUpRows = wrapUpResult.rows
  const lastSession = wrapUpRows.length === 0 ? null : {
    date: String(wrapUpRows[0].date),
    tutorName: wrapUpRows[0].tutor_name === null ? null : String(wrapUpRows[0].tutor_name),
    lessons: wrapUpRows.map(row => ({
      moduleSlug: String(row.module_slug),
      finishedLesson: Number(row.finished_lesson) === 1,
      stoppedAt: row.stopped_at === null ? null : String(row.stopped_at),
      note: String(row.note ?? ''),
    })),
  }

  return { note, lastSession }
}
