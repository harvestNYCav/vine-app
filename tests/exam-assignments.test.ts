import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  assignExamSection,
  assignmentResult,
  EXAM_ASSIGNMENTS_TABLE_SQL,
  examSectionKey,
  getExamSectionResults,
  listExamAssignmentsForDate,
  listExamAssignmentsSince,
  pendingExamAssignments,
  unassignExamSection,
  type ExamAssignment,
  type ExamSectionResult,
} from '../lib/exam-assignments'

const PROGRESS_COLUMNS = `
  user_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  section_slug TEXT NOT NULL,
  latest_points INTEGER NOT NULL DEFAULT 0,
  latest_possible INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, exam_id, section_slug)
`

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-exam-assignments-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.execute(EXAM_ASSIGNMENTS_TABLE_SQL)
    await db.executeMultiple(`
      CREATE TABLE math_exam_section_progress (${PROGRESS_COLUMNS});
      CREATE TABLE ela_exam_section_progress (${PROGRESS_COLUMNS});
    `)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

const section = { subject: 'math', examId: 'exam-1', sectionSlug: 'fractions' } as const

test('assigning the same section twice on one day keeps a single assignment', async () => {
  await withFixture(async db => {
    await assignExamSection(db, { ...section, studentId: 's1', tutorId: 't1', date: '2026-09-26', now: 100 })
    await assignExamSection(db, { ...section, studentId: 's1', tutorId: 't2', date: '2026-09-26', now: 200 })

    const today = await listExamAssignmentsForDate(db, 's1', '2026-09-26')
    assert.equal(today.length, 1)
    assert.equal(today[0].tutorId, 't1')
    assert.equal(today[0].createdAt, 100)
  })
})

test('unassigning removes only that day and section', async () => {
  await withFixture(async db => {
    await assignExamSection(db, { ...section, studentId: 's1', tutorId: 't1', date: '2026-09-25', now: 100 })
    await assignExamSection(db, { ...section, studentId: 's1', tutorId: 't1', date: '2026-09-26', now: 200 })
    await assignExamSection(db, { ...section, sectionSlug: 'geometry', studentId: 's1', tutorId: 't1', date: '2026-09-26', now: 300 })

    await unassignExamSection(db, { ...section, studentId: 's1', date: '2026-09-26' })

    const remaining = await listExamAssignmentsSince(db, 's1', '2026-09-01')
    assert.deepEqual(remaining.map(item => [item.date, item.sectionSlug]), [
      ['2026-09-26', 'geometry'],
      ['2026-09-25', 'fractions'],
    ])
  })
})

test('an assignment only counts as finished by practice completed after it was assigned', async () => {
  await withFixture(async db => {
    await db.execute({
      sql: 'INSERT INTO math_exam_section_progress VALUES (?, ?, ?, ?, ?, ?)',
      args: ['s1', 'exam-1', 'fractions', 6, 8, 500],
    })
    const results = await getExamSectionResults(db, 's1')
    const assignment = (createdAt: number): ExamAssignment => ({
      id: 'a', studentId: 's1', ...section, date: '2026-09-26', tutorId: 't1', createdAt,
    })

    assert.deepEqual(assignmentResult(assignment(400), results), {
      latestPoints: 6, latestPossible: 8, finishedAt: 500, percentage: 75,
    })
    assert.equal(assignmentResult(assignment(600), results), null)
    assert.equal(assignmentResult({ ...assignment(400), subject: 'ela' }, results), null)
  })
})

test('pending assignments use the latest assignment per section and drop finished ones', () => {
  const make = (id: string, sectionSlug: string, createdAt: number): ExamAssignment => ({
    id, studentId: 's1', subject: 'math', examId: 'exam-1', sectionSlug, date: '2026-09-26', tutorId: 't1', createdAt,
  })
  const results = new Map<string, ExamSectionResult>([
    [examSectionKey({ subject: 'math', examId: 'exam-1', sectionSlug: 'done' }), { latestPoints: 1, latestPossible: 1, finishedAt: 250 }],
    [examSectionKey({ subject: 'math', examId: 'exam-1', sectionSlug: 'reassigned' }), { latestPoints: 1, latestPossible: 1, finishedAt: 150 }],
  ])

  const pending = pendingExamAssignments([
    make('1', 'done', 200),
    make('2', 'reassigned', 100),
    make('3', 'reassigned', 300),
    make('4', 'new', 50),
  ], results)

  assert.deepEqual(pending.map(item => item.id), ['3', '4'])
})
