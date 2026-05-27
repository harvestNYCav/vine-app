import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'vine.db'))
db.pragma('journal_mode = WAL')

// Schema (same as lib/db.ts)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT NOT NULL, role TEXT NOT NULL, tutor_id TEXT, created_at INTEGER NOT NULL, last_active INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS vocab_progress (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, word_id TEXT NOT NULL, module_slug TEXT NOT NULL, interval INTEGER NOT NULL DEFAULT 1, repetitions INTEGER NOT NULL DEFAULT 0, next_review_at INTEGER NOT NULL, correct_count INTEGER NOT NULL DEFAULT 0, incorrect_count INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id, word_id));
  CREATE TABLE IF NOT EXISTS module_progress (user_id TEXT NOT NULL, module_slug TEXT NOT NULL, vocab_viewed_at INTEGER, practice_completed_at INTEGER, practice_score INTEGER, teach_session_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, module_slug));
  CREATE TABLE IF NOT EXISTS teaching_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, module_slug TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, message_count INTEGER NOT NULL DEFAULT 0, phrases_taught TEXT NOT NULL DEFAULT '[]', encouragement TEXT NOT NULL DEFAULT '', transcript TEXT NOT NULL DEFAULT '[]');
  CREATE TABLE IF NOT EXISTS activity_log (user_id TEXT NOT NULL, date TEXT NOT NULL, activity_type TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (user_id, date, activity_type));
`)

const PIN = '1234'
const pinHash = bcrypt.hashSync(PIN, 10)
const now = Date.now()

// Clear existing demo data
db.prepare("DELETE FROM users WHERE name IN ('Maria', 'Carlos', 'Sarah')").run()

// Create demo students
const mariaId = randomUUID()
const carlosId = randomUUID()
const sarahId = randomUUID()

db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, NULL, ?, ?)').run(mariaId, 'Maria', pinHash, 'student', now - 2 * 86400000, now - 86400000)
db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, NULL, ?, ?)').run(carlosId, 'Carlos', pinHash, 'student', now - 5 * 86400000, now - 3 * 86400000)
db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, NULL, ?, ?)').run(sarahId, 'Sarah', pinHash, 'tutor', now - 7 * 86400000, now)

// Maria's progress (active student, 3 modules done)
const mariaModules = ['introducing-yourself', 'buying-groceries', 'navigating-subway']
for (const slug of mariaModules) {
  db.prepare('INSERT OR REPLACE INTO module_progress VALUES (?, ?, ?, ?, ?, ?)').run(
    mariaId, slug, now - 7 * 86400000, now - 5 * 86400000, 80, slug === 'buying-groceries' ? 1 : 0
  )
}

// Maria's vocab progress
const mariaVocab = [
  ['introducing-yourself:my-name-is', 'introducing-yourself', 3, 7, 0],
  ['introducing-yourself:nice-to-meet-you', 'introducing-yourself', 3, 5, 1],
  ['buying-groceries:aisle', 'buying-groceries', 1, 1, 3],
  ['buying-groceries:receipt', 'buying-groceries', 1, 2, 2],
  ['buying-groceries:how-much', 'buying-groceries', 3, 4, 0],
]
for (const [wordId, moduleSlug, interval, correct, incorrect] of mariaVocab) {
  db.prepare('INSERT OR REPLACE INTO vocab_progress VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    randomUUID(), mariaId, wordId, moduleSlug, interval, correct as number, now + (interval as number) * 86400000, correct, incorrect
  )
}

// Maria's teaching session
db.prepare('INSERT OR REPLACE INTO teaching_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  randomUUID(), mariaId, 'buying-groceries', now - 4 * 86400000, now - 4 * 86400000 + 600000, 12,
  JSON.stringify(['How much does this cost?', 'Where is the...?', 'cash or credit card', 'on sale']),
  'You are a natural teacher! Carlos learned so much from your clear explanations.',
  JSON.stringify([
    { role: 'user', content: 'Hello Carlos! Today I will teach you about buying groceries.' },
    { role: 'assistant', content: 'Oh hello! I need very much help with this. I go store but I not know how to say things.' },
  ])
)

// Maria's activity log
const mariaDays = [0, 1, 2, 4, 5, 6]
for (const daysAgo of mariaDays) {
  const date = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
  db.prepare('INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)').run(mariaId, date, 'practice', 3)
  if (daysAgo < 3) {
    db.prepare('INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)').run(mariaId, date, 'module', 1)
  }
}

// Carlos's progress (newer student, 1 module started)
db.prepare('INSERT OR REPLACE INTO module_progress VALUES (?, ?, ?, ?, ?, ?)').run(
  carlosId, 'introducing-yourself', now - 3 * 86400000, null, null, 0
)
for (const daysAgo of [3, 4]) {
  const date = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
  db.prepare('INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)').run(carlosId, date, 'module', 1)
}

console.log('✅ Seed complete!')
console.log('   Students: Maria (PIN: 1234), Carlos (PIN: 1234)')
console.log('   Tutor: Sarah (PIN: 1234)')
console.log('   All accounts use PIN: 1234')
