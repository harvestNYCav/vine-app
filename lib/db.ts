import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'vine.db')

let db: Database.Database

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'tutor')),
      tutor_id TEXT,
      created_at INTEGER NOT NULL,
      last_active INTEGER NOT NULL
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
      date TEXT NOT NULL UNIQUE,
      module_slug TEXT NOT NULL,
      tutor_id TEXT NOT NULL,
      homework_assigned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
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
  `)
}

export default getDb
