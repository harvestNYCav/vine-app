import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@libsql/client'
import { getMathLeaderboard } from '../lib/math-leaderboard'

async function fixture() {
  const db = createClient({ url: ':memory:' })
  await db.executeMultiple(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE student_tutors (student_id TEXT, tutor_id TEXT);
    CREATE TABLE math_sessions (
      id TEXT PRIMARY KEY, user_id TEXT, session_type TEXT, started_at INTEGER, ended_at INTEGER,
      total_problems INTEGER, correct INTEGER, accuracy INTEGER
    );
    INSERT INTO users VALUES ('al', 'Alejandro', 'student'), ('bo', 'Bo', 'student'), ('cy', 'Cy', 'student');
    INSERT INTO student_tutors VALUES ('bo', 't1');
    INSERT INTO math_sessions VALUES
      ('a1', 'al', 'practice_5', 0, 300000, 30, 28, 93),
      ('a2', 'al', 'practice_5', 1, 300001, 26, 25, 96),
      ('b1', 'bo', 'practice_5', 2, 300002, 27, 26, 96),
      ('c1', 'cy', 'practice_5', 3, 300003, 20, 18, 90),
      -- 10-question runs: a perfect run beats a faster imperfect one; the fastest perfect run wins.
      ('a3', 'al', 'flat_10', 0, 90000, 10, 10, 100),
      ('a4', 'al', 'flat_10', 0, 60000, 10, 10, 100),
      ('b2', 'bo', 'flat_10', 0, 30000, 10, 9, 90),
      ('c2', 'cy', 'flat_10', 0, 70000, 10, 10, 100);
  `)
  return db
}

test('each student appears once, with their best timed run', async () => {
  const db = await fixture()
  const rows = await getMathLeaderboard(db, 'practice_5', { limit: 20 })
  assert.deepEqual(rows.map(row => [row.name, row.correct]), [['Alejandro', 28], ['Bo', 26], ['Cy', 18]])
  db.close()
})

test('fixed-length runs rank perfect runs by time, once per student', async () => {
  const db = await fixture()
  const rows = await getMathLeaderboard(db, 'flat_10', { limit: 20 })
  assert.deepEqual(rows.map(row => [row.name, row.duration_ms]), [['Alejandro', 60000], ['Cy', 70000], ['Bo', 30000]])
  db.close()
})

test('a tutor scope lists only their students', async () => {
  const db = await fixture()
  const rows = await getMathLeaderboard(db, 'practice_5', { limit: 5, tutorId: 't1' })
  assert.deepEqual(rows.map(row => row.name), ['Bo'])
  db.close()
})
