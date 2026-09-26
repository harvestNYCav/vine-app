import { randomUUID } from 'crypto'
import type { Client } from '@libsql/client'

export type ExamSubject = 'math' | 'ela'

// A tutor asking a student to practice one released-exam section on a given day. Unlike ESL
// sessions this never gates access: every section for the student's grade stays open, and an
// assignment only puts the section in front of the student and on the tutor's schedule.
export const EXAM_ASSIGNMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS exam_assignments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL CHECK(subject IN ('math', 'ela')),
    exam_id TEXT NOT NULL,
    section_slug TEXT NOT NULL,
    date TEXT NOT NULL,
    tutor_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(student_id, subject, exam_id, section_slug, date)
  )
`

export interface ExamSectionRef {
  subject: ExamSubject
  examId: string
  sectionSlug: string
}

export interface ExamAssignment extends ExamSectionRef {
  id: string
  studentId: string
  date: string
  tutorId: string
  createdAt: number
}

// Latest finished practice for a section, from math_/ela_exam_section_progress.
export interface ExamSectionResult {
  latestPoints: number
  latestPossible: number
  finishedAt: number
}

export function isExamSubject(value: unknown): value is ExamSubject {
  return value === 'math' || value === 'ela'
}

export function examSectionKey(ref: ExamSectionRef) {
  return `${ref.subject}:${ref.examId}:${ref.sectionSlug}`
}

function toAssignment(row: Record<string, unknown>): ExamAssignment {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    subject: row.subject === 'ela' ? 'ela' : 'math',
    examId: String(row.exam_id),
    sectionSlug: String(row.section_slug),
    date: String(row.date),
    tutorId: String(row.tutor_id),
    createdAt: Number(row.created_at),
  }
}

export async function assignExamSection(
  db: Client,
  input: ExamSectionRef & { studentId: string; tutorId: string; date: string; now?: number },
) {
  // Assigning the same section twice on one day is a no-op rather than an error.
  await db.execute({
    sql: `
      INSERT INTO exam_assignments (id, student_id, subject, exam_id, section_slug, date, tutor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject, exam_id, section_slug, date) DO NOTHING
    `,
    args: [randomUUID(), input.studentId, input.subject, input.examId, input.sectionSlug, input.date, input.tutorId, input.now ?? Date.now()],
  })
}

export async function unassignExamSection(db: Client, input: ExamSectionRef & { studentId: string; date: string }) {
  await db.execute({
    sql: `
      DELETE FROM exam_assignments
      WHERE student_id = ? AND subject = ? AND exam_id = ? AND section_slug = ? AND date = ?
    `,
    args: [input.studentId, input.subject, input.examId, input.sectionSlug, input.date],
  })
}

export async function listExamAssignmentsForDate(db: Client, studentId: string, date: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM exam_assignments WHERE student_id = ? AND date = ? ORDER BY created_at, id',
    args: [studentId, date],
  })
  return result.rows.map(row => toAssignment(row as Record<string, unknown>))
}

export async function listExamAssignmentsSince(db: Client, studentId: string, sinceDate: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM exam_assignments WHERE student_id = ? AND date >= ? ORDER BY date DESC, created_at DESC, id',
    args: [studentId, sinceDate],
  })
  return result.rows.map(row => toAssignment(row as Record<string, unknown>))
}

export async function getExamSectionResults(db: Client, studentId: string): Promise<Map<string, ExamSectionResult>> {
  const [math, ela] = await Promise.all([
    db.execute({ sql: 'SELECT exam_id, section_slug, latest_points, latest_possible, updated_at FROM math_exam_section_progress WHERE user_id = ?', args: [studentId] }),
    db.execute({ sql: 'SELECT exam_id, section_slug, latest_points, latest_possible, updated_at FROM ela_exam_section_progress WHERE user_id = ?', args: [studentId] }),
  ])
  const results = new Map<string, ExamSectionResult>()
  for (const [subject, rows] of [['math', math.rows], ['ela', ela.rows]] as const) {
    for (const row of rows) {
      results.set(examSectionKey({ subject, examId: String(row.exam_id), sectionSlug: String(row.section_slug) }), {
        latestPoints: Number(row.latest_points),
        latestPossible: Number(row.latest_possible),
        finishedAt: Number(row.updated_at),
      })
    }
  }
  return results
}

// An assignment is done once the student finishes that section after it was assigned; practice
// from before the assignment doesn't count.
export function assignmentResult(assignment: ExamAssignment, results: Map<string, ExamSectionResult>) {
  const result = results.get(examSectionKey(assignment))
  if (!result || result.finishedAt < assignment.createdAt || result.latestPossible === 0) return null
  return {
    ...result,
    percentage: Math.round((result.latestPoints / result.latestPossible) * 100),
  }
}

// What a student still has to do: the most recent assignment of each section, minus any the
// student has finished since it was assigned. Expects assignments newest first.
export function pendingExamAssignments(assignments: ExamAssignment[], results: Map<string, ExamSectionResult>) {
  const latestBySection = new Map<string, ExamAssignment>()
  for (const assignment of assignments) {
    const key = examSectionKey(assignment)
    const existing = latestBySection.get(key)
    if (!existing || assignment.createdAt > existing.createdAt) latestBySection.set(key, assignment)
  }
  return [...latestBySection.values()]
    .filter(assignment => assignmentResult(assignment, results) === null)
    .sort((a, b) => b.createdAt - a.createdAt)
}
