import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Client } from '@libsql/client'
import { deleteUserProfile } from '../lib/admin-reset'
import { getDb } from '../lib/db'

const directory = mkdtempSync(join(tmpdir(), 'vine-admin-reset-'))
// getDb() builds the real schema, so these tests see every table a deletion has to clean up.
process.env.TURSO_DATABASE_URL = `file:${join(directory, 'reset.db')}`

after(async () => {
  const db = await getDb()
  db.close()
  rmSync(directory, { recursive: true, force: true })
})

const PERSON_COLUMNS = ['user_id', 'student_id', 'tutor_id', 'parent_id']

async function freshDb(): Promise<Client> {
  const db = await getDb()
  const tables = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('schema_migrations', 'admin_email_allowlist', 'sqlite_sequence')",
    args: [],
  })
  await db.batch(tables.rows.map(row => ({ sql: `DELETE FROM ${String(row.name)}`, args: [] })))
  return db
}

// Two students taught by one tutor, with one parent: a lesson with a wrap-up, an exam section, a
// note, an ESL placement and attendance for each student.
async function seedProgram(db: Client) {
  const now = Date.now()
  const date = '2026-11-07'
  const user = (id: string, role: string) => ({
    sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    args: [id, id, 'hash', role, now, now],
  })
  const studentRows = (studentId: string) => [
    user(studentId, 'student'),
    { sql: "INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, 'esl', ?)", args: [studentId, now] },
    { sql: "INSERT INTO module_progress (user_id, module_slug) VALUES (?, 'introducing-yourself')", args: [studentId] },
    { sql: "INSERT INTO student_tutors (student_id, tutor_id, created_at) VALUES (?, 'tutor-1', ?)", args: [studentId, now] },
    { sql: "INSERT INTO parent_students (parent_id, student_id, created_at) VALUES ('parent-1', ?, ?)", args: [studentId, now] },
    {
      sql: "INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at) VALUES (?, ?, ?, 'introducing-yourself', 'tutor-1', ?)",
      args: [`session-${studentId}`, studentId, date, now],
    },
    {
      sql: "INSERT INTO session_wrap_ups (session_id, tutor_id, finished_lesson, rating, created_at, updated_at) VALUES (?, 'tutor-1', 1, 4, ?, ?)",
      args: [`session-${studentId}`, now, now],
    },
    {
      sql: "INSERT INTO exam_assignments (id, student_id, subject, exam_id, section_slug, date, tutor_id, created_at) VALUES (?, ?, 'math', 'exam', 'section', ?, 'tutor-1', ?)",
      args: [`exam-${studentId}`, studentId, date, now],
    },
    { sql: 'INSERT INTO attendance (session_date, student_id, present) VALUES (?, ?, 1)', args: [date, studentId] },
    {
      sql: "INSERT INTO tutor_notes (id, student_id, tutor_id, body, created_at) VALUES (?, ?, 'tutor-1', 'Bring flashcards', ?)",
      args: [`note-${studentId}`, studentId, now],
    },
    {
      sql: `INSERT INTO esl_placements
              (id, student_id, tutor_id, date, test_version, answers, basics_score, suggested_level, level, created_at)
            VALUES (?, ?, 'tutor-1', ?, 'v1', '{}', 5, 'beginner', 'beginner', ?)`,
      args: [`placement-${studentId}`, studentId, date, now],
    },
  ]

  await db.batch([
    user('tutor-1', 'tutor'),
    user('parent-1', 'parent'),
    ...studentRows('student-1'),
    ...studentRows('student-2'),
  ])
}

async function rowsReferencing(db: Client, id: string): Promise<string[]> {
  const tables = await db.execute({ sql: "SELECT name FROM sqlite_master WHERE type = 'table'", args: [] })
  const found: string[] = []
  for (const table of tables.rows.map(row => String(row.name))) {
    const columns = await db.execute({ sql: `PRAGMA table_info(${table})`, args: [] })
    for (const column of columns.rows.map(row => String(row.name)).filter(name => PERSON_COLUMNS.includes(name))) {
      const count = await db.execute({ sql: `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`, args: [id] })
      if (Number(count.rows[0].count) > 0) found.push(`${table}.${column}`)
    }
  }
  const user = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM users WHERE id = ?', args: [id] })
  if (Number(user.rows[0].count) > 0) found.push('users.id')
  return found
}

async function orphanedWrapUps(db: Client): Promise<number> {
  const result = await db.execute({
    sql: 'SELECT COUNT(*) AS count FROM session_wrap_ups WHERE session_id NOT IN (SELECT id FROM sessions)',
    args: [],
  })
  return Number(result.rows[0].count)
}

test('deleting a student removes every row about them and leaves other students alone', async () => {
  const db = await freshDb()
  await seedProgram(db)
  const before = await rowsReferencing(db, 'student-2')

  await deleteUserProfile(db, 'student-1', 'student')

  assert.deepEqual(await rowsReferencing(db, 'student-1'), [])
  assert.equal(await orphanedWrapUps(db), 0)
  assert.deepEqual(await rowsReferencing(db, 'student-2'), before)
})

test('deleting a tutor unassigns them but keeps the ESL levels they recorded', async () => {
  const db = await freshDb()
  await seedProgram(db)

  await deleteUserProfile(db, 'tutor-1', 'tutor')

  assert.deepEqual(await rowsReferencing(db, 'tutor-1'), ['esl_placements.tutor_id'])
  assert.equal(await orphanedWrapUps(db), 0)
  const placements = await db.execute({ sql: 'SELECT student_id FROM esl_placements ORDER BY student_id', args: [] })
  assert.deepEqual(placements.rows.map(row => String(row.student_id)), ['student-1', 'student-2'])
})

test('deleting a parent leaves their children untouched', async () => {
  const db = await freshDb()
  await seedProgram(db)
  const before = await rowsReferencing(db, 'student-1')

  await deleteUserProfile(db, 'parent-1', 'parent')

  assert.deepEqual(await rowsReferencing(db, 'parent-1'), [])
  assert.deepEqual(
    await rowsReferencing(db, 'student-1'),
    before.filter(location => location !== 'parent_students.student_id'),
  )
})
