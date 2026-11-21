import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { SESSION_WRAP_UPS_TABLE_SQL } from '../lib/session-metrics'
import {
  getSessionHandoffNotes,
  getStudentHandoff,
  parseHandoffNote,
  saveSessionHandoffNote,
  TUTOR_NOTES_TABLE_SQL,
} from '../lib/tutor-handoff'

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-tutor-handoff-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL, date TEXT NOT NULL, module_slug TEXT NOT NULL,
        tutor_id TEXT NOT NULL, homework_assigned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
      );
      INSERT INTO users VALUES ('maria', 'Maria', 'student'), ('sarah', 'Sarah', 'tutor'), ('ben', 'Ben', 'tutor');
      INSERT INTO sessions VALUES
        ('old', 'maria', '2026-11-07', 'greetings', 'ben', 0, 1),
        ('last-a', 'maria', '2026-11-14', 'verb-to-be', 'sarah', 0, 2),
        ('last-b', 'maria', '2026-11-14', 'numbers', 'sarah', 0, 3),
        ('today', 'maria', '2026-11-21', 'past-tense', 'ben', 0, 4);
    `)
    await db.execute(SESSION_WRAP_UPS_TABLE_SQL)
    await db.execute(TUTOR_NOTES_TABLE_SQL)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

async function wrapUp(db: Client, sessionId: string, tutorId: string, finished: boolean, stoppedAt: string | null, note: string) {
  await db.execute({
    sql: `INSERT INTO session_wrap_ups (session_id, tutor_id, finished_lesson, stopped_at, rating, note, created_at, updated_at)
          VALUES (?, ?, ?, ?, 4, ?, 0, 0)`,
    args: [sessionId, tutorId, finished ? 1 : 0, stoppedAt, note],
  })
}

test('hand-off notes are trimmed and capped', () => {
  assert.equal(parseHandoffNote('  review vocab  '), 'review vocab')
  assert.equal(parseHandoffNote(42), '')
  assert.equal(parseHandoffNote('x'.repeat(3000)).length, 2000)
})

test('a session keeps one hand-off note that edits replace and blanks remove', async () => {
  await withFixture(async db => {
    await saveSessionHandoffNote(db, 'sarah', 'last-a', 'Review vocab', 100)
    await saveSessionHandoffNote(db, 'sarah', 'last-a', 'Review vocab, then role-play', 200)
    const rows = await db.execute("SELECT student_id, body, created_at FROM tutor_notes WHERE session_id = 'last-a'")
    assert.equal(rows.rows.length, 1)
    assert.equal(rows.rows[0].student_id, 'maria')
    assert.equal(rows.rows[0].body, 'Review vocab, then role-play')
    assert.equal(Number(rows.rows[0].created_at), 100)
    assert.equal((await getSessionHandoffNotes(db, ['last-a'])).get('last-a'), 'Review vocab, then role-play')

    await saveSessionHandoffNote(db, 'sarah', 'last-a', '')
    assert.equal((await getSessionHandoffNotes(db, ['last-a'])).size, 0)

    // A session that doesn't exist gets no note.
    await saveSessionHandoffNote(db, 'sarah', 'missing', 'Hello')
    assert.equal((await db.execute('SELECT COUNT(*) AS n FROM tutor_notes')).rows[0].n, 0)
  })
})

test('the hand-off shows the last session day and ignores notes from today', async () => {
  await withFixture(async db => {
    await wrapUp(db, 'old', 'ben', true, null, 'Old news')
    await wrapUp(db, 'last-a', 'sarah', false, 'Vocabulary', 'Shy at first')
    await wrapUp(db, 'last-b', 'sarah', true, null, '')
    await wrapUp(db, 'today', 'ben', true, null, 'Today')
    await saveSessionHandoffNote(db, 'sarah', 'last-a', 'Start with vocab review', 100)
    await saveSessionHandoffNote(db, 'ben', 'today', 'Written today', 300)

    const handoff = await getStudentHandoff(db, 'maria', '2026-11-21')
    assert.deepEqual(handoff.note, { body: 'Start with vocab review', tutorName: 'Sarah', createdAt: 100 })
    assert.equal(handoff.lastSession?.date, '2026-11-14')
    assert.equal(handoff.lastSession?.tutorName, 'Sarah')
    assert.deepEqual(handoff.lastSession?.lessons, [
      { moduleSlug: 'verb-to-be', finishedLesson: false, stoppedAt: 'Vocabulary', note: 'Shy at first' },
      { moduleSlug: 'numbers', finishedLesson: true, stoppedAt: null, note: '' },
    ])

    // A note added from the Tutor Notes card (no session) counts, whenever it was written.
    await db.execute("INSERT INTO tutor_notes (id, student_id, tutor_id, body, created_at) VALUES ('n', 'maria', 'ben', 'Mid-week note', 400)")
    assert.equal((await getStudentHandoff(db, 'maria', '2026-11-21')).note?.body, 'Mid-week note')
  })
})

test('a new student has nothing to hand off', async () => {
  await withFixture(async db => {
    assert.deepEqual(await getStudentHandoff(db, 'maria', '2026-11-21'), { note: null, lastSession: null })
  })
})
