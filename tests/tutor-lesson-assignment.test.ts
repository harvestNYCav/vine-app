import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { ensureSessionsTableSupportsMultipleLessons } from '../lib/db'
import {
  assignTutorLesson,
  markSessionHomeworkAssigned,
} from '../lib/tutor-lesson-assignment'

async function createFixture(): Promise<{ db: Client; directory: string }> {
  const directory = mkdtempSync(join(tmpdir(), 'vine-lesson-assignment-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  await db.executeMultiple(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE user_tracks (
      user_id TEXT NOT NULL,
      track TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, track)
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      tutor_id TEXT NOT NULL,
      homework_assigned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(student_id, date, module_slug)
    );
    INSERT INTO users (id, name, role) VALUES ('ela-student', 'Ari', 'student');
    INSERT INTO users (id, name, role) VALUES ('esl-student', 'Bea', 'student');
    INSERT INTO users (id, name, role) VALUES ('tutor', 'Tess', 'tutor');
    INSERT INTO user_tracks (user_id, track, created_at) VALUES ('ela-student', 'ela', 1);
    INSERT INTO user_tracks (user_id, track, created_at) VALUES ('esl-student', 'esl', 1);
  `)
  return { db, directory }
}

async function withFixture(run: (db: Client) => Promise<void>) {
  const { db, directory } = await createFixture()
  try {
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

test('cross-track assignment requires confirmation and makes no changes first', async () => {
  await withFixture(async db => {
    const result = await assignTutorLesson(db, {
      moduleSlug: 'reading-main-idea',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student', 'esl-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    })

    assert.deepEqual(result, {
      status: 'confirmation_required',
      track: 'ela',
      studentsMissingTrack: [{ id: 'esl-student', name: 'Bea' }],
      collisions: [],
    })
    const sessions = await db.execute('SELECT COUNT(*) AS count FROM sessions')
    assert.equal(Number(sessions.rows[0]?.count), 0)
    const tracks = await db.execute({
      sql: 'SELECT track FROM user_tracks WHERE user_id = ? ORDER BY track',
      args: ['esl-student'],
    })
    assert.deepEqual(tracks.rows.map(row => String(row.track)), ['esl'])
  })
})

test('confirmed cross-track assignment preserves tracks, enrolls, and schedules', async () => {
  await withFixture(async db => {
    const result = await assignTutorLesson(db, {
      moduleSlug: 'reading-main-idea',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student', 'esl-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: true,
      now: 100,
    })

    assert.equal(result.status, 'assigned')
    if (result.status !== 'assigned') return
    assert.deepEqual(result.enrolledStudentIds, ['esl-student'])
    assert.deepEqual(result.sessions.map(session => session.studentId), ['ela-student', 'esl-student'])

    const tracks = await db.execute({
      sql: 'SELECT track FROM user_tracks WHERE user_id = ? ORDER BY track',
      args: ['esl-student'],
    })
    assert.deepEqual(tracks.rows.map(row => String(row.track)), ['ela', 'esl'])
    const sessions = await db.execute({
      sql: 'SELECT student_id, module_slug FROM sessions ORDER BY student_id',
      args: [],
    })
    assert.deepEqual(sessions.rows.map(row => [String(row.student_id), String(row.module_slug)]), [
      ['ela-student', 'reading-main-idea'],
      ['esl-student', 'reading-main-idea'],
    ])
  })
})

test('compatible students are assigned without an enrollment confirmation', async () => {
  await withFixture(async db => {
    const result = await assignTutorLesson(db, {
      moduleSlug: 'reading-main-idea',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    })

    assert.equal(result.status, 'assigned')
    if (result.status !== 'assigned') return
    assert.deepEqual(result.enrolledStudentIds, [])
    assert.equal(result.sessions.length, 1)
  })
})

test('a different lesson on the same date requires a choice before any student is changed', async () => {
  await withFixture(async db => {
    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('existing', 'ela-student', '2026-07-18', 'existing-lesson', 'tutor', 1)
      `,
      args: [],
    })

    const result = await assignTutorLesson(db, {
      moduleSlug: 'new-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    })

    assert.deepEqual(result, {
      status: 'confirmation_required',
      track: 'ela',
      studentsMissingTrack: [],
      collisions: [{
        student: { id: 'ela-student', name: 'Ari' },
        sessions: [{ id: 'existing', moduleSlug: 'existing-lesson' }],
      }],
    })
    const rows = await db.execute({
      sql: 'SELECT module_slug FROM sessions ORDER BY module_slug',
      args: [],
    })
    assert.deepEqual(rows.rows.map(row => String(row.module_slug)), ['existing-lesson'])
  })
})

test('concurrent first assignments serialize so the later writer sees the date collision', async () => {
  const { db, directory } = await createFixture()
  const secondDb = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    const baseInput = {
      moduleTrack: 'ela' as const,
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    }
    const results = await Promise.all([
      assignTutorLesson(db, { ...baseInput, moduleSlug: 'first-lesson' }),
      assignTutorLesson(secondDb, { ...baseInput, moduleSlug: 'second-lesson' }),
    ])

    assert.deepEqual(
      results.map(result => result.status).sort(),
      ['assigned', 'confirmation_required'],
    )
    const rows = await db.execute('SELECT module_slug FROM sessions')
    assert.equal(rows.rows.length, 1)
    const confirmation = results.find(result => result.status === 'confirmation_required')
    assert.ok(confirmation && confirmation.collisions.length === 1)
  } finally {
    secondDb.close()
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Add on top preserves existing lessons and adds the selected lesson', async () => {
  await withFixture(async db => {
    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('existing', 'ela-student', '2026-07-18', 'existing-lesson', 'tutor', 1)
      `,
      args: [],
    })

    const result = await assignTutorLesson(db, {
      moduleSlug: 'new-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      collisionAction: 'add',
      now: 100,
    })

    assert.equal(result.status, 'assigned')
    const rows = await db.execute({
      sql: 'SELECT module_slug FROM sessions ORDER BY module_slug',
      args: [],
    })
    assert.deepEqual(rows.rows.map(row => String(row.module_slug)), ['existing-lesson', 'new-lesson'])
  })
})

test('Replace removes every other lesson for that student and date', async () => {
  await withFixture(async db => {
    await db.batch([
      {
        sql: `
          INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
          VALUES ('existing-a', 'ela-student', '2026-07-18', 'existing-a', 'tutor', 1)
        `,
        args: [],
      },
      {
        sql: `
          INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
          VALUES ('existing-b', 'ela-student', '2026-07-18', 'existing-b', 'tutor', 2)
        `,
        args: [],
      },
    ])

    const result = await assignTutorLesson(db, {
      moduleSlug: 'replacement',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      collisionAction: 'replace',
      now: 100,
    })

    assert.equal(result.status, 'assigned')
    const rows = await db.execute({
      sql: 'SELECT module_slug FROM sessions ORDER BY module_slug',
      args: [],
    })
    assert.deepEqual(rows.rows.map(row => String(row.module_slug)), ['replacement'])
  })
})

test('track enrollment and date collision confirmations are both mutation-free until accepted', async () => {
  await withFixture(async db => {
    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('existing', 'esl-student', '2026-07-18', 'existing-lesson', 'tutor', 1)
      `,
      args: [],
    })

    const preflight = await assignTutorLesson(db, {
      moduleSlug: 'new-ela-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['esl-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    })
    assert.equal(preflight.status, 'confirmation_required')
    if (preflight.status !== 'confirmation_required') return
    assert.deepEqual(preflight.studentsMissingTrack, [{ id: 'esl-student', name: 'Bea' }])
    assert.equal(preflight.collisions.length, 1)

    const collisionOnlyConfirmed = await assignTutorLesson(db, {
      moduleSlug: 'new-ela-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['esl-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      collisionAction: 'add',
      now: 100,
    })
    assert.equal(collisionOnlyConfirmed.status, 'confirmation_required')
    const tracksBeforeConfirmation = await db.execute({
      sql: 'SELECT track FROM user_tracks WHERE user_id = ? ORDER BY track',
      args: ['esl-student'],
    })
    assert.deepEqual(tracksBeforeConfirmation.rows.map(row => String(row.track)), ['esl'])
    const sessionsBeforeConfirmation = await db.execute('SELECT COUNT(*) AS count FROM sessions')
    assert.equal(Number(sessionsBeforeConfirmation.rows[0]?.count), 1)

    const assigned = await assignTutorLesson(db, {
      moduleSlug: 'new-ela-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['esl-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: true,
      collisionAction: 'add',
      now: 100,
    })
    assert.equal(assigned.status, 'assigned')
    const tracks = await db.execute({
      sql: 'SELECT track FROM user_tracks WHERE user_id = ? ORDER BY track',
      args: ['esl-student'],
    })
    assert.deepEqual(tracks.rows.map(row => String(row.track)), ['ela', 'esl'])
    const sessions = await db.execute('SELECT COUNT(*) AS count FROM sessions')
    assert.equal(Number(sessions.rows[0]?.count), 2)
  })
})

test('assigning the exact same module again is idempotent and needs no collision choice', async () => {
  await withFixture(async db => {
    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('existing', 'ela-student', '2026-07-18', 'same-lesson', 'tutor', 1)
      `,
      args: [],
    })

    const result = await assignTutorLesson(db, {
      moduleSlug: 'same-lesson',
      moduleTrack: 'ela',
      date: '2026-07-18',
      studentIds: ['ela-student'],
      tutorId: 'tutor',
      confirmTrackEnrollment: false,
      now: 100,
    })

    assert.equal(result.status, 'assigned')
    const rows = await db.execute('SELECT COUNT(*) AS count FROM sessions')
    assert.equal(Number(rows.rows[0]?.count), 1)
  })
})

test('homework assignment targets one lesson when a day has multiple lessons', async () => {
  await withFixture(async db => {
    await db.batch([
      {
        sql: `
          INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
          VALUES ('first', 'ela-student', '2026-07-18', 'first-lesson', 'tutor', 1)
        `,
        args: [],
      },
      {
        sql: `
          INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
          VALUES ('second', 'ela-student', '2026-07-18', 'second-lesson', 'tutor', 2)
        `,
        args: [],
      },
    ])

    assert.equal(await markSessionHomeworkAssigned(db, 'first', '2026-07-18'), true)
    const rows = await db.execute({
      sql: 'SELECT id, homework_assigned FROM sessions ORDER BY id',
      args: [],
    })
    assert.deepEqual(rows.rows.map(row => [String(row.id), Number(row.homework_assigned)]), [
      ['first', 1],
      ['second', 0],
    ])
  })
})

test('the session migration preserves rows and permits distinct lessons on one student-date', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-session-migration-'))
  const db = createClient({ url: `file:${join(directory, 'legacy.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,
        module_slug TEXT NOT NULL,
        tutor_id TEXT NOT NULL,
        homework_assigned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(student_id, date)
      );
      INSERT INTO sessions (
        id, student_id, date, module_slug, tutor_id, homework_assigned, created_at
      ) VALUES ('preserved', 'student', '2026-07-18', 'first', 'tutor', 1, 1);
    `)

    await ensureSessionsTableSupportsMultipleLessons(db)
    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('added', 'student', '2026-07-18', 'second', 'tutor', 2)
      `,
      args: [],
    })
    const rows = await db.execute({
      sql: 'SELECT id, module_slug, homework_assigned FROM sessions ORDER BY id',
      args: [],
    })
    assert.deepEqual(rows.rows.map(row => [
      String(row.id),
      String(row.module_slug),
      Number(row.homework_assigned),
    ]), [
      ['added', 'second', 0],
      ['preserved', 'first', 1],
    ])
    await assert.rejects(db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, created_at)
        VALUES ('duplicate', 'student', '2026-07-18', 'second', 'tutor', 3)
      `,
      args: [],
    }))
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
