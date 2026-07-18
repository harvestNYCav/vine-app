import { createClient, type Client } from '@libsql/client'
import { seedDefaultAdminAllowlistIfEmpty } from './admin-allowlist'

let client: Client | null = null
let initialized = false
let initialization: Promise<void> | null = null

export async function getDb(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? localFileUrl()
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  }
  if (!initialized) {
    initialization ??= initSchema(client)
      .then(() => {
        initialized = true
      })
      .catch(error => {
        initialization = null
        throw error
      })
    await initialization
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
      grade_level INTEGER CHECK(grade_level BETWEEN 3 AND 8),
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
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
      UNIQUE(student_id, date, module_slug)
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

    CREATE TABLE IF NOT EXISTS math_exam_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      section_slug TEXT NOT NULL,
      language TEXT NOT NULL CHECK(language IN ('en', 'es')),
      started_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      finished_at INTEGER,
      question_ids TEXT NOT NULL,
      responses TEXT NOT NULL DEFAULT '[]',
      points_earned INTEGER,
      points_possible INTEGER
    );

    CREATE TABLE IF NOT EXISTS math_exam_section_progress (
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      section_slug TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      best_points INTEGER NOT NULL DEFAULT 0,
      best_possible INTEGER NOT NULL DEFAULT 0,
      latest_points INTEGER NOT NULL DEFAULT 0,
      latest_possible INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, exam_id, section_slug)
    );

    CREATE TABLE IF NOT EXISTS ela_exam_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      section_slug TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      finished_at INTEGER,
      question_ids TEXT NOT NULL,
      responses TEXT NOT NULL DEFAULT '[]',
      points_earned INTEGER,
      points_possible INTEGER
    );

    CREATE TABLE IF NOT EXISTS ela_exam_section_progress (
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      section_slug TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      best_points INTEGER NOT NULL DEFAULT 0,
      best_possible INTEGER NOT NULL DEFAULT 0,
      latest_points INTEGER NOT NULL DEFAULT 0,
      latest_possible INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, exam_id, section_slug)
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
  await ensureColumn(
    db,
    'student_settings',
    'grade_level',
    'INTEGER CHECK(grade_level BETWEEN 3 AND 8)',
  )
  await backfillExistingMathStudentGradeLevels(db)
  await ensureUsersTableSupportsAdminRole(db)
  await ensureSessionsTableSupportsStudentId(db)
  await ensureSessionsTableSupportsMultipleLessons(db)
  await seedDefaultAdminAllowlistIfEmpty(db)
}

async function ensureColumn(db: Client, table: string, column: string, definition: string): Promise<boolean> {
  const result = await db.execute({ sql: `PRAGMA table_info(${table})`, args: [] })
  const hasColumn = result.rows.some(row => String(row.name) === column)
  if (!hasColumn) {
    try {
      await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, args: [] })
    } catch (error) {
      // Separate server instances can both observe a missing column before
      // either ALTER commits. Treat the losing ALTER as successful only after
      // the database confirms that the other instance added the column.
      const afterRace = await db.execute({ sql: `PRAGMA table_info(${table})`, args: [] })
      const addedByAnotherInstance = afterRace.rows.some(row => String(row.name) === column)
      if (!addedByAnotherInstance) throw error
    }
    return true
  }
  return false
}

async function backfillExistingMathStudentGradeLevels(db: Client): Promise<void> {
  const migrationName = '2026-07-15-student-grade-level'
  const existing = await db.execute({
    sql: 'SELECT 1 FROM schema_migrations WHERE name = ?',
    args: [migrationName],
  })
  if (existing.rows.length > 0) return

  const now = Date.now()
  await db.batch([
    {
      sql: `
        INSERT INTO student_settings (user_id, math_spanish_enabled, grade_level, updated_at)
        SELECT user_id, 0, 3, ?
        FROM user_tracks
        WHERE track = 'math'
          AND user_id NOT IN (SELECT user_id FROM user_tracks WHERE track = 'ela')
        ON CONFLICT(user_id) DO NOTHING
      `,
      args: [now],
    },
    {
      sql: `
        UPDATE student_settings
        SET grade_level = 3, updated_at = ?
        WHERE grade_level IS NULL
          AND user_id IN (SELECT user_id FROM user_tracks WHERE track = 'math')
          AND user_id NOT IN (SELECT user_id FROM user_tracks WHERE track = 'ela')
      `,
      args: [now],
    },
    {
      sql: 'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
      args: [migrationName, now],
    },
  ], 'write')
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
      UNIQUE(student_id, date, module_slug)
    );
  `)
}

export async function ensureSessionsTableSupportsMultipleLessons(db: Client): Promise<void> {
  const migrationName = '2026-07-17-multiple-lessons-per-student-date'
  const tableResult = await db.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sessions'",
    args: [],
  })
  const normalizedTableSql = String(tableResult.rows[0]?.sql ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
  const supportsMultipleLessons = normalizedTableSql.includes('unique(student_id,date,module_slug)')

  if (!supportsMultipleLessons) {
    await db.executeMultiple(`
      DROP TABLE IF EXISTS sessions_multiple_lessons_migration;

      CREATE TABLE sessions_multiple_lessons_migration (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,
        module_slug TEXT NOT NULL,
        tutor_id TEXT NOT NULL,
        homework_assigned INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(student_id, date, module_slug)
      );

      INSERT INTO sessions_multiple_lessons_migration (
        id, student_id, date, module_slug, tutor_id, homework_assigned, created_at
      )
      SELECT id, student_id, date, module_slug, tutor_id, homework_assigned, created_at
      FROM sessions;

      DROP TABLE sessions;
      ALTER TABLE sessions_multiple_lessons_migration RENAME TO sessions;
    `)
  }

  await db.execute({
    sql: 'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
    args: [migrationName, Date.now()],
  })
}

export default getDb
