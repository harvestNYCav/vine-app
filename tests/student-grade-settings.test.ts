import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { normalizeGradeLevel } from '../lib/grade-levels'

test('grade normalization accepts only Grades 3 through 8', () => {
  assert.equal(normalizeGradeLevel(3), 3)
  assert.equal(normalizeGradeLevel(8), 8)
  assert.equal(normalizeGradeLevel(2), null)
  assert.equal(normalizeGradeLevel(9), null)
  assert.equal(normalizeGradeLevel('3'), null)
  assert.equal(normalizeGradeLevel(null), null)
})

test('the grade migration preserves prior Math access without guessing an ELA grade', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-grade-migration-'))
  const path = join(directory, 'legacy.db')
  const url = `file:${path}`
  const legacy = createClient({ url })

  try {
    await legacy.executeMultiple(`
      CREATE TABLE user_tracks (
        user_id TEXT NOT NULL,
        track TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, track)
      );
      CREATE TABLE student_settings (
        user_id TEXT PRIMARY KEY,
        math_spanish_enabled INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO user_tracks (user_id, track, created_at) VALUES ('existing-math', 'math', 1);
      INSERT INTO user_tracks (user_id, track, created_at) VALUES ('existing-ela', 'ela', 1);
      INSERT INTO user_tracks (user_id, track, created_at) VALUES ('existing-dual', 'math', 1);
      INSERT INTO user_tracks (user_id, track, created_at) VALUES ('existing-dual', 'ela', 1);
      INSERT INTO student_settings (user_id, math_spanish_enabled, updated_at)
      VALUES ('existing-math', 1, 1);
      INSERT INTO student_settings (user_id, math_spanish_enabled, updated_at)
      VALUES ('existing-ela', 0, 1);
      INSERT INTO student_settings (user_id, math_spanish_enabled, updated_at)
      VALUES ('existing-dual', 0, 1);
    `)
    legacy.close()

    process.env.TURSO_DATABASE_URL = url
    const { default: getDb } = await import('../lib/db')
    const [db, sameDbA, sameDbB] = await Promise.all([getDb(), getDb(), getDb()])
    assert.equal(db, sameDbA)
    assert.equal(db, sameDbB)

    const settings = await db.execute({
      sql: 'SELECT math_spanish_enabled, grade_level FROM student_settings WHERE user_id = ?',
      args: ['existing-math'],
    })
    assert.equal(Number(settings.rows[0]?.math_spanish_enabled), 1)
    assert.equal(Number(settings.rows[0]?.grade_level), 3)

    const elaSettings = await db.execute({
      sql: 'SELECT grade_level FROM student_settings WHERE user_id = ?',
      args: ['existing-ela'],
    })
    assert.equal(elaSettings.rows[0]?.grade_level, null)

    const dualTrackSettings = await db.execute({
      sql: 'SELECT grade_level FROM student_settings WHERE user_id = ?',
      args: ['existing-dual'],
    })
    assert.equal(dualTrackSettings.rows[0]?.grade_level, null)

    const migration = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM schema_migrations WHERE name = '2026-07-15-student-grade-level'",
      args: [],
    })
    assert.equal(Number(migration.rows[0]?.count), 1)

    await assert.rejects(db.execute({
      sql: 'UPDATE student_settings SET grade_level = 9 WHERE user_id = ?',
      args: ['existing-math'],
    }))
    db.close()
  } finally {
    delete process.env.TURSO_DATABASE_URL
    try {
      legacy.close()
    } catch {
      // The client may already be closed after the legacy fixture is prepared.
    }
    rmSync(directory, { recursive: true, force: true })
  }
})
