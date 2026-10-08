import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  buildSessionMetricsCsv,
  getDeckProgressForDate,
  getSessionWrapUps,
  InvalidWrapUpError,
  LESSON_DECK_PROGRESS_TABLE_SQL,
  MAX_ACTIVE_MS_PER_REPORT,
  parseSessionWrapUp,
  recordDeckProgress,
  saveSessionWrapUp,
  SESSION_WRAP_UPS_TABLE_SQL,
} from '../lib/session-metrics'

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-session-metrics-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL, date TEXT NOT NULL, module_slug TEXT NOT NULL,
        tutor_id TEXT NOT NULL, homework_assigned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
        UNIQUE(student_id, date, module_slug)
      );
      CREATE TABLE attendance (
        session_date TEXT NOT NULL, student_id TEXT NOT NULL, present INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (session_date, student_id)
      );
      CREATE TABLE module_progress (
        user_id TEXT NOT NULL, module_slug TEXT NOT NULL, homework_completed_at INTEGER, homework_score INTEGER,
        PRIMARY KEY (user_id, module_slug)
      );
      INSERT INTO users VALUES ('maria', 'Maria', 'student'), ('sarah', 'Sarah', 'tutor');
      INSERT INTO sessions VALUES ('s1', 'maria', '2026-10-10', 'verb-to-be', 'sarah', 1, 1);
      INSERT INTO attendance VALUES ('2026-10-10', 'maria', 1);
      INSERT INTO module_progress VALUES ('maria', 'verb-to-be', 5, 80);
    `)
    await db.execute(LESSON_DECK_PROGRESS_TABLE_SQL)
    await db.execute(SESSION_WRAP_UPS_TABLE_SQL)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

const report = { tutorId: 'sarah', date: '2026-10-10', moduleSlug: 'verb-to-be', slideCount: 23 }

test('deck progress keeps the furthest slide and adds up on-screen time', async () => {
  await withFixture(async db => {
    await recordDeckProgress(db, { ...report, slideIndex: 15, section: 'Listening & writing', activeMs: 60_000 })
    await recordDeckProgress(db, { ...report, slideIndex: 3, section: 'Vocabulary', activeMs: 30_000 })
    await recordDeckProgress(db, { ...report, slideIndex: 4, section: 'Vocabulary', activeMs: 10 * 60_000 })

    const progress = (await getDeckProgressForDate(db, '2026-10-10', ['verb-to-be'])).get('verb-to-be')
    assert.equal(progress?.furthestSlide, 15)
    assert.equal(progress?.furthestSection, 'Listening & writing')
    // The 10-minute report is capped, so a laptop left open doesn't count as teaching.
    assert.equal(progress?.activeMs, 90_000 + MAX_ACTIVE_MS_PER_REPORT)
  })
})

test('wrap-up validation rejects incomplete or impossible answers', () => {
  assert.throws(() => parseSessionWrapUp({ sessionId: 's1', rating: 4 }), InvalidWrapUpError)
  assert.throws(() => parseSessionWrapUp({ sessionId: 's1', finishedLesson: true, rating: 6 }), InvalidWrapUpError)
  assert.throws(
    () => parseSessionWrapUp({ sessionId: 's1', finishedLesson: true, rating: 4, quizScore: 11, quizTotal: 10 }),
    InvalidWrapUpError,
  )
  assert.deepEqual(
    parseSessionWrapUp({ sessionId: 's1', finishedLesson: true, stoppedAt: 'Role-play', rating: 4, quizTotal: 10, note: '  ok  ' }),
    { sessionId: 's1', finishedLesson: true, stoppedAt: null, quizScore: null, quizTotal: null, rating: 4, note: 'ok' },
  )
})

test('wrap-ups save, update, and only attach to real sessions', async () => {
  await withFixture(async db => {
    const wrapUp = parseSessionWrapUp({
      sessionId: 's1', finishedLesson: false, stoppedAt: 'Role-play', quizScore: 7, quizTotal: 10, rating: 3,
    })
    assert.equal(await saveSessionWrapUp(db, 'sarah', wrapUp, 100), true)
    assert.equal(await saveSessionWrapUp(db, 'sarah', { ...wrapUp, rating: 5 }, 200), true)
    assert.equal(await saveSessionWrapUp(db, 'sarah', { ...wrapUp, sessionId: 'missing' }), false)

    const saved = (await getSessionWrapUps(db, ['s1'])).get('s1')
    assert.equal(saved?.rating, 5)
    assert.equal(saved?.stoppedAt, 'Role-play')
    assert.equal(saved?.updatedAt, 200)
  })
})

test('the CSV export joins attendance, homework, deck progress, and the wrap-up', async () => {
  await withFixture(async db => {
    await recordDeckProgress(db, { ...report, slideIndex: 22, section: 'Wrap-up', activeMs: 120_000 })
    await saveSessionWrapUp(db, 'sarah', parseSessionWrapUp({
      sessionId: 's1', finishedLesson: true, quizScore: 9, quizTotal: 10, rating: 4, note: 'Loved the "listening", part',
    }))

    const [header, row] = (await buildSessionMetricsCsv(db)).trim().split('\n')
    assert.match(header, /^date,student,tutor,lesson,present/)
    assert.equal(
      row,
      '2026-10-10,Maria,Sarah,verb-to-be,yes,yes,yes,80,23,23,Wrap-up,2,yes,,9,10,4,"Loved the ""listening"", part"',
    )
  })
})
