import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient, type Client } from '@libsql/client'
import bcrypt from 'bcryptjs'

const DEMO_NAMES = ['Maria', 'Carlos', 'Sarah']
const USER_ID_TABLES = [
  'user_tracks',
  'student_settings',
  'vocab_progress',
  'module_progress',
  'teaching_sessions',
  'activity_log',
  'math_progress',
  'math_sessions',
  'math_attempts',
  'math_exam_attempts',
  'math_exam_section_progress',
  'ela_exam_attempts',
  'ela_exam_section_progress',
]

function runSeed(databaseUrl: string): void {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PROGRAM_TIME_ZONE: 'America/New_York',
      TURSO_DATABASE_URL: databaseUrl,
    },
    encoding: 'utf8',
  })

  assert.equal(
    result.status,
    0,
    `seed exited with ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  )
  assert.match(result.stdout, /Seed complete/)
}

async function count(db: Client, table: string): Promise<number> {
  const result = await db.execute({ sql: `SELECT COUNT(*) AS count FROM ${table}`, args: [] })
  return Number(result.rows[0]?.count)
}

test('demo seed matches the current schema and safely replaces its own prior records', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-demo-seed-'))
  const databaseUrl = `file:${join(directory, 'demo.db')}`
  const db = createClient({ url: databaseUrl })

  try {
    runSeed(databaseUrl)

    const firstUsers = await db.execute({
      sql: "SELECT id, name FROM users WHERE name IN ('Maria', 'Carlos', 'Sarah') ORDER BY name",
      args: [],
    })
    assert.equal(firstUsers.rows.length, 3)
    const firstIds = firstUsers.rows.map(row => String(row.id))

    runSeed(databaseUrl)

    const users = await db.execute({
      sql: "SELECT id, name, role, pin_hash FROM users WHERE name IN ('Maria', 'Carlos', 'Sarah') ORDER BY name",
      args: [],
    })
    assert.deepEqual(
      users.rows.map(row => [String(row.name), String(row.role)]),
      [
        ['Carlos', 'student'],
        ['Maria', 'student'],
        ['Sarah', 'tutor'],
      ],
    )
    for (const user of users.rows) {
      assert.equal(await bcrypt.compare('1234', String(user.pin_hash)), true)
      assert.equal(firstIds.includes(String(user.id)), false)
    }

    assert.equal(await count(db, 'user_tracks'), 2)
    assert.equal(await count(db, 'student_tutors'), 2)
    assert.equal(await count(db, 'sessions'), 4)
    assert.equal(await count(db, 'attendance'), 4)
    assert.equal(await count(db, 'module_progress'), 4)
    assert.equal(await count(db, 'vocab_progress'), 5)
    assert.equal(await count(db, 'teaching_sessions'), 1)
    assert.equal(await count(db, 'activity_log'), 11)

    const tracks = await db.execute({
      sql: 'SELECT track FROM user_tracks ORDER BY user_id',
      args: [],
    })
    assert.deepEqual(tracks.rows.map(row => String(row.track)), ['esl', 'esl'])

    const moduleColumns = await db.execute({ sql: 'PRAGMA table_info(module_progress)', args: [] })
    const columnNames = moduleColumns.rows.map(row => String(row.name))
    assert.equal(columnNames.includes('homework_completed_at'), true)
    assert.equal(columnNames.includes('homework_score'), true)

    for (const oldId of firstIds) {
      for (const table of USER_ID_TABLES) {
        const stale = await db.execute({
          sql: `SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`,
          args: [oldId],
        })
        assert.equal(Number(stale.rows[0]?.count), 0, `${table} retained old demo user ${oldId}`)
      }
      for (const [table, where] of [
        ['student_tutors', 'student_id = ? OR tutor_id = ?'],
        ['sessions', 'student_id = ? OR tutor_id = ?'],
        ['attendance', 'student_id = ?'],
        ['tutor_notes', 'student_id = ? OR tutor_id = ?'],
      ] as const) {
        const args = where.includes('OR') ? [oldId, oldId] : [oldId]
        const stale = await db.execute({
          sql: `SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`,
          args,
        })
        assert.equal(Number(stale.rows[0]?.count), 0, `${table} retained old demo user ${oldId}`)
      }
    }

    assert.deepEqual(
      users.rows.map(row => String(row.name)).sort(),
      DEMO_NAMES.slice().sort(),
    )
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
