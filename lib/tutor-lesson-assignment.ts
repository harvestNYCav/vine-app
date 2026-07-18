import { randomUUID } from 'crypto'
import type { Client } from '@libsql/client'
import type { Track } from '@/types'

export type LessonTrack = Exclude<Track, 'math'>

export interface AssignmentStudent {
  id: string
  name: string
}

export interface AssignedSession {
  id: string
  studentId: string
  date: string
  moduleSlug: string
  tutorId: string
  homeworkAssigned: boolean
  createdAt: number
}

export type LessonCollisionAction = 'replace' | 'add'

export interface AssignmentCollision {
  student: AssignmentStudent
  sessions: Array<Pick<AssignedSession, 'id' | 'moduleSlug'>>
}

export type TutorLessonAssignmentResult =
  | {
      status: 'confirmation_required'
      track: LessonTrack
      studentsMissingTrack: AssignmentStudent[]
      collisions: AssignmentCollision[]
    }
  | {
      status: 'assigned'
      sessions: AssignedSession[]
      enrolledStudentIds: string[]
    }

export class AssignmentStudentNotFoundError extends Error {
  missingStudentIds: string[]

  constructor(missingStudentIds: string[]) {
    super('One or more selected students were not found.')
    this.name = 'AssignmentStudentNotFoundError'
    this.missingStudentIds = missingStudentIds
    Object.setPrototypeOf(this, AssignmentStudentNotFoundError.prototype)
  }
}

interface AssignTutorLessonInput {
  moduleSlug: string
  moduleTrack: LessonTrack
  date: string
  studentIds: string[]
  tutorId: string
  confirmTrackEnrollment: boolean
  collisionAction?: LessonCollisionAction
  now?: number
}

type SessionRow = {
  id: string
  student_id: string
  date: string
  module_slug: string
  tutor_id: string
  homework_assigned: number | bigint
  created_at: number | bigint
}

function toSessionJson(row: SessionRow): AssignedSession {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    moduleSlug: row.module_slug,
    tutorId: row.tutor_id,
    homeworkAssigned: Number(row.homework_assigned) === 1,
    createdAt: Number(row.created_at),
  }
}

const MAX_WRITE_TRANSACTION_ATTEMPTS = 8

function isSqliteBusyError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return String(error.code).startsWith('SQLITE_BUSY')
}

function waitForWriteRetry(attempt: number): Promise<void> {
  const delayMs = Math.min(10 * (2 ** attempt), 100)
  return new Promise(resolve => setTimeout(resolve, delayMs))
}

export async function assignTutorLesson(
  db: Client,
  input: AssignTutorLessonInput,
): Promise<TutorLessonAssignmentResult> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await assignTutorLessonInWriteTransaction(db, input)
    } catch (error) {
      if (!isSqliteBusyError(error) || attempt >= MAX_WRITE_TRANSACTION_ATTEMPTS - 1) {
        throw error
      }
      await waitForWriteRetry(attempt)
    }
  }
}

async function assignTutorLessonInWriteTransaction(
  db: Client,
  input: AssignTutorLessonInput,
): Promise<TutorLessonAssignmentResult> {
  const studentIds = [...new Set(input.studentIds)]
  if (studentIds.length === 0) {
    throw new AssignmentStudentNotFoundError([])
  }

  const placeholders = studentIds.map(() => '?').join(',')
  const transaction = await db.transaction('write')
  try {
    // Keep the authoritative preflight and its writes under one write lock. This
    // prevents another assignment from appearing after the collision check but
    // before an Add/Replace choice is applied.
    const studentsResult = await transaction.execute({
      sql: `SELECT id, name FROM users WHERE role = 'student' AND id IN (${placeholders})`,
      args: studentIds,
    })
    const studentsById = new Map(studentsResult.rows.map(row => [
      String(row.id),
      { id: String(row.id), name: String(row.name) },
    ]))
    const missingStudentIds = studentIds.filter(id => !studentsById.has(id))
    if (missingStudentIds.length > 0) {
      throw new AssignmentStudentNotFoundError(missingStudentIds)
    }

    const enrolledResult = await transaction.execute({
      sql: `SELECT user_id FROM user_tracks WHERE track = ? AND user_id IN (${placeholders})`,
      args: [input.moduleTrack, ...studentIds],
    })
    const enrolledIds = new Set(enrolledResult.rows.map(row => String(row.user_id)))
    const studentsMissingTrack = studentIds
      .filter(id => !enrolledIds.has(id))
      .map(id => studentsById.get(id)!)

    const existingSessionsResult = await transaction.execute({
      sql: `
        SELECT * FROM sessions
        WHERE date = ? AND student_id IN (${placeholders})
        ORDER BY created_at, id
      `,
      args: [input.date, ...studentIds],
    })
    const existingSessions = existingSessionsResult.rows as unknown as SessionRow[]
    const collisions = studentIds.flatMap(studentId => {
      const otherSessions = existingSessions.filter(row => (
        row.student_id === studentId && row.module_slug !== input.moduleSlug
      ))
      if (otherSessions.length === 0) return []
      return [{
        student: studentsById.get(studentId)!,
        sessions: otherSessions.map(row => ({ id: row.id, moduleSlug: row.module_slug })),
      }]
    })

    const needsTrackConfirmation = studentsMissingTrack.length > 0 && !input.confirmTrackEnrollment
    const needsCollisionConfirmation = collisions.length > 0 && !input.collisionAction
    if (needsTrackConfirmation || needsCollisionConfirmation) {
      await transaction.rollback()
      return {
        status: 'confirmation_required',
        track: input.moduleTrack,
        studentsMissingTrack,
        collisions,
      }
    }

    const now = input.now ?? Date.now()
    await transaction.batch([
      ...studentsMissingTrack.map(student => ({
        sql: `
          INSERT INTO user_tracks (user_id, track, created_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, track) DO NOTHING
        `,
        args: [student.id, input.moduleTrack, now],
      })),
      ...(input.collisionAction === 'replace' ? collisions.map(collision => ({
        sql: 'DELETE FROM sessions WHERE student_id = ? AND date = ? AND module_slug <> ?',
        args: [collision.student.id, input.date, input.moduleSlug],
      })) : []),
      ...studentIds.map(studentId => ({
        sql: `
          INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, homework_assigned, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
          ON CONFLICT(student_id, date, module_slug) DO NOTHING
        `,
        args: [randomUUID(), studentId, input.date, input.moduleSlug, input.tutorId, now],
      })),
    ])

    const sessionsResult = await transaction.execute({
      sql: `
        SELECT * FROM sessions
        WHERE date = ? AND module_slug = ? AND student_id IN (${placeholders})
      `,
      args: [input.date, input.moduleSlug, ...studentIds],
    })
    const sessionsByStudentId = new Map(
      (sessionsResult.rows as unknown as SessionRow[]).map(row => [row.student_id, toSessionJson(row)]),
    )
    const result: TutorLessonAssignmentResult = {
      status: 'assigned',
      sessions: studentIds.map(id => sessionsByStudentId.get(id)!),
      enrolledStudentIds: studentsMissingTrack.map(student => student.id),
    }

    await transaction.commit()
    return result
  } finally {
    transaction.close()
  }
}

export async function markSessionHomeworkAssigned(
  db: Client,
  sessionId: string,
  date: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: 'UPDATE sessions SET homework_assigned = 1 WHERE id = ? AND date = ?',
    args: [sessionId, date],
  })
  return result.rowsAffected > 0
}
