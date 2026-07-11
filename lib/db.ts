import { createClient, type Client } from '@libsql/client'
import { seedDefaultAdminAllowlistIfEmpty } from './admin-allowlist'

let client: Client | null = null
let initialized = false

export async function getDb(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? localFileUrl()
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  }
  if (!initialized) {
    await initSchema(client)
    initialized = true
  }
  return client
}

function localFileUrl(): string {
  // Local dev / Railway only — Vercel's filesystem is read-only, set TURSO_DATABASE_URL there
  const { mkdirSync, existsSync } = require('fs') as typeof import('fs')
  const { join } = require('path') as typeof import('path')
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return `file:${join(dir, 'vine.db')}`
}

async function initSchema(db: Client): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'tutor', 'admin')),
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL,
      CHECK(role != 'admin' OR email IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS user_tracks (
      user_id TEXT NOT NULL,
      track TEXT NOT NULL CHECK(track IN ('ela', 'esl', 'math')),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, track)
    );

    CREATE TABLE IF NOT EXISTS student_tutors (
      student_id TEXT NOT NULL,
      tutor_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, tutor_id)
    );

    CREATE TABLE IF NOT EXISTS student_settings (
      user_id TEXT PRIMARY KEY,
      math_spanish_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_email_verifications (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_email_allowlist (
      email TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocab_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      interval INTEGER NOT NULL DEFAULT 1,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at INTEGER NOT NULL,
      correct_count INTEGER NOT NULL DEFAULT 0,
      incorrect_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, word_id)
    );

    CREATE TABLE IF NOT EXISTS module_progress (
      user_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      vocab_viewed_at INTEGER,
      practice_completed_at INTEGER,
      practice_score INTEGER,
      teach_session_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, module_slug)
    );

    CREATE TABLE IF NOT EXISTS teaching_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      message_count INTEGER NOT NULL DEFAULT 0,
      phrases_taught TEXT NOT NULL DEFAULT '[]',
      encouragement TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('practice', 'module', 'teach')),
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, date, activity_type)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      tutor_id TEXT NOT NULL,
      homework_assigned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(student_id, date)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      session_date TEXT NOT NULL,
      student_id TEXT NOT NULL,
      present INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (session_date, student_id)
    );

    CREATE TABLE IF NOT EXISTS math_progress (
      user_id TEXT PRIMARY KEY,
      skill_mastery TEXT NOT NULL DEFAULT '{}',
      current_skill TEXT,
      diagnostic_done INTEGER NOT NULL DEFAULT 0,
      total_problems INTEGER NOT NULL DEFAULT 0,
      total_correct INTEGER NOT NULL DEFAULT 0,
      mistake_profile TEXT NOT NULL DEFAULT '{}',
      skill_attempt_counts TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS math_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_type TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      total_problems INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      accuracy INTEGER NOT NULL DEFAULT 0,
      current_skill TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS math_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_type TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      finished_at INTEGER,
      problems TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tutor_notes (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      tutor_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
  await ensureColumn(db, 'users', 'email', 'TEXT')
  await ensureColumn(db, 'module_progress', 'homework_completed_at', 'INTEGER')
  await ensureColumn(db, 'module_progress', 'homework_score', 'INTEGER')
  await ensureUsersTableSupportsAdminRole(db)
  await ensureSessionsTableSupportsStudentId(db)
  await seedDefaultAdminAllowlistIfEmpty(db)
}

async function ensureColumn(db: Client, table: string, column: string, definition: string): Promise<void> {
  const result = await db.execute({ sql: `PRAGMA table_info(${table})`, args: [] })
  const hasColumn = result.rows.some(row => String(row.name) === column)
  if (!hasColumn) {
    await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, args: [] })
  }
}

async function ensureUsersTableSupportsAdminRole(db: Client): Promise<void> {
  const result = await db.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'",
    args: [],
  })
  const tableSql = String(result.rows[0]?.sql ?? '')
  const roleCheck = tableSql.match(/CHECK\s*\(\s*role\s+IN\s*\(([^)]*)\)\s*\)/i)
  if (!roleCheck || /['"]admin['"]/i.test(roleCheck[1])) return

  await db.executeMultiple(`
    DROP TABLE IF EXISTS users_schema_migration;

    CREATE TABLE users_schema_migration (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'tutor', 'admin')),
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL,
      CHECK(role != 'admin' OR email IS NOT NULL)
    );

    INSERT INTO users_schema_migration (id, name, email, pin_hash, role, created_at, last_active)
    SELECT id, name, email, pin_hash, role, created_at, last_active
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_schema_migration RENAME TO users;
  `)
}

async function ensureSessionsTableSupportsStudentId(db: Client): Promise<void> {
  const result = await db.execute({ sql: 'PRAGMA table_info(sessions)', args: [] })
  const hasStudentId = result.rows.some(row => String(row.name) === 'student_id')
  if (hasStudentId) return

  // Old schema was one shared row per date (cohort-wide); the tutoring model is
  // actually per-student, so the handful of existing rows can't be attributed to
  // one student and are dropped rather than migrated.
  await db.executeMultiple(`
    DROP TABLE IF EXISTS sessions;

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
  `)
}

export default getDb
