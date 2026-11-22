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
        role TEXT NOT NULL,
        is_test INTEGER NOT NULL DEFAULT 0,
        paused_on TEXT,
        paused_until TEXT
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

test('the admin view can leave out test accounts and students paused that day', async () => {
  await withFixture(async db => {
    await db.executeMultiple(`
      INSERT INTO users (id, name, role, is_test) VALUES ('test-tutor', 'TestTutor', 'tutor', 1);
      INSERT INTO users (id, name, role, is_test) VALUES ('test-student', 'TestStudentESL', 'student', 1);
      UPDATE users SET paused_on = '2026-08-01' WHERE id = 'student-2';
    `)
    await setStudentCheckIn(db, { date: '2026-08-13', studentId: 'student-1', present: true, recordedBy: 'test-tutor' })

    const everyone = await getCheckInDay(db, '2026-08-13')
    assert.deepEqual(everyone.tutors.map(tutor => tutor.tutorName), ['Sarah', 'TestTutor'])
    assert.deepEqual(everyone.students.map(student => student.studentName), ['Amina', 'Diego', 'TestStudentESL'])

    const admin = await getCheckInDay(db, '2026-08-13', { hideTestAccounts: true, hidePausedAsOf: '2026-08-13' })
    assert.deepEqual(admin.tutors.map(tutor => tutor.tutorName), ['Sarah'])
    assert.deepEqual(admin.students.map(student => student.studentName), ['Amina'], 'Diego is paused and unmarked')
    assert.equal(admin.students[0].recordedByName, 'TestTutor', 'a hidden test tutor still shows as who marked them')
  })
})

test('marking a paused student present brings them back', async () => {
  await withFixture(async db => {
    await db.execute("UPDATE users SET paused_on = '2026-08-10', paused_until = '2027-01-25' WHERE id = 'student-1'")

    // An older session, from before the pause, leaves it alone.
    await setStudentCheckIn(db, { date: '2026-08-06', studentId: 'student-1', present: true, recordedBy: 'tutor-1' })
    // Marked absent leaves it alone too.
    await setStudentCheckIn(db, { date: '2026-08-13', studentId: 'student-1', present: false, recordedBy: 'tutor-1' })
    let row = (await db.execute("SELECT paused_on FROM users WHERE id = 'student-1'")).rows[0]
    assert.equal(row.paused_on, '2026-08-10')

    await setStudentCheckIn(db, { date: '2026-08-20', studentId: 'student-1', present: true, recordedBy: 'tutor-1' })
    row = (await db.execute("SELECT paused_on, paused_until FROM users WHERE id = 'student-1'")).rows[0]
    assert.equal(row.paused_on, null)
    assert.equal(row.paused_until, null)
  })
})
