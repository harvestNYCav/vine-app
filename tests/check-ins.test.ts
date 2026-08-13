import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  getCheckInDay,
  isCheckInDate,
  setStudentCheckIn,
  setTutorCheckIn,
  summarizeCheckInCounts,
} from '../lib/check-ins'

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-check-ins-'))
  const db = createClient({ url: `file:${join(directory, 'check-ins.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL
      );
      CREATE TABLE attendance (
        session_date TEXT NOT NULL,
        student_id TEXT NOT NULL,
        present INTEGER NOT NULL DEFAULT 0,
        recorded_by TEXT,
        recorded_at INTEGER,
        PRIMARY KEY (session_date, student_id)
      );
      CREATE TABLE tutor_check_ins (
        session_date TEXT NOT NULL,
        tutor_id TEXT NOT NULL,
        present INTEGER NOT NULL DEFAULT 0,
        recorded_at INTEGER NOT NULL,
        PRIMARY KEY (session_date, tutor_id)
      );
      INSERT INTO users (id, name, role) VALUES ('tutor-1', 'Sarah', 'tutor');
      INSERT INTO users (id, name, role) VALUES ('student-1', 'Amina', 'student');
      INSERT INTO users (id, name, role) VALUES ('student-2', 'Diego', 'student');
    `)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

test('only real calendar dates are accepted as a check-in day', () => {
  assert.equal(isCheckInDate('2026-08-13'), true)
  assert.equal(isCheckInDate('13/08/2026'), false)
  assert.equal(isCheckInDate(undefined), false)
})

test('someone nobody has marked yet is not counted as absent', () => {
  assert.deepEqual(
    summarizeCheckInCounts([{ present: true }, { present: false }, { present: null }]),
    { present: 1, marked: 2, total: 3 },
  )
})

test('a day with no check-ins leaves everyone unmarked rather than absent', async () => {
  await withFixture(async db => {
    const day = await getCheckInDay(db, '2026-08-13')
    assert.deepEqual(day.tutors.map(tutor => tutor.present), [null])
    assert.deepEqual(day.students.map(student => student.present), [null, null])
  })
})

test('an admin sees which tutor marked each student, and re-marking overwrites', async () => {
  await withFixture(async db => {
    await setTutorCheckIn(db, { date: '2026-08-13', tutorId: 'tutor-1', present: true })
    await setStudentCheckIn(db, {
      date: '2026-08-13',
      studentId: 'student-1',
      present: false,
      recordedBy: 'tutor-1',
    })
    await setStudentCheckIn(db, {
      date: '2026-08-13',
      studentId: 'student-1',
      present: true,
      recordedBy: 'tutor-1',
    })

    const day = await getCheckInDay(db, '2026-08-13')
    assert.equal(day.tutors[0].present, true)

    const amina = day.students.find(student => student.studentId === 'student-1')!
    assert.equal(amina.present, true)
    assert.equal(amina.recordedByName, 'Sarah')

    const diego = day.students.find(student => student.studentId === 'student-2')!
    assert.equal(diego.present, null)
    assert.equal(diego.recordedByName, null)
  })
})

test('check-ins are scoped to their own session date', async () => {
  await withFixture(async db => {
    await setStudentCheckIn(db, {
      date: '2026-08-13',
      studentId: 'student-1',
      present: true,
      recordedBy: 'tutor-1',
    })

    const otherDay = await getCheckInDay(db, '2026-08-20')
    assert.deepEqual(otherDay.students.map(student => student.present), [null, null])
  })
})
