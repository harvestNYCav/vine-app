import type { Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { seedDefaultAdminAllowlist } from './admin-allowlist'

const TEST_ACCOUNT_PIN = '1234'
const TEST_STUDENTS = [
  { name: 'TestStudentELA', track: 'ela' },
  { name: 'TestStudentESL', track: 'esl' },
  { name: 'TestStudentMath', track: 'math' },
]

async function seedTestAccounts(db: Client): Promise<void> {
  const now = Date.now()
  const pinHash = await bcrypt.hash(TEST_ACCOUNT_PIN, 10)
  const tutorId = randomUUID()
  const studentRows = TEST_STUDENTS.map(student => ({ ...student, id: randomUUID() }))

  await db.batch([
    {
      sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
      args: [tutorId, 'TestTutor', pinHash, 'tutor', now, now],
    },
    ...studentRows.map(student => ({
      sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
      args: [student.id, student.name, pinHash, 'student', now, now],
    })),
    ...studentRows.map(student => ({
      sql: 'INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, ?, ?)',
      args: [student.id, student.track, now],
    })),
  ])
}

export async function deleteUserProfile(db: Client, userId: string, role: 'student' | 'tutor'): Promise<void> {
  const statements = [
    { sql: 'DELETE FROM user_tracks WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM student_settings WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM vocab_progress WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM module_progress WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM teaching_sessions WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM activity_log WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM math_progress WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM math_sessions WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM math_attempts WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM math_exam_attempts WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM math_exam_section_progress WHERE user_id = ?', args: [userId] },
  ]

  if (role === 'student') {
    statements.push(
      { sql: 'DELETE FROM student_tutors WHERE student_id = ?', args: [userId] },
      { sql: 'DELETE FROM attendance WHERE student_id = ?', args: [userId] },
    )
  } else {
    statements.push(
      { sql: 'DELETE FROM student_tutors WHERE tutor_id = ?', args: [userId] },
      { sql: 'DELETE FROM sessions WHERE tutor_id = ?', args: [userId] },
    )
  }

  statements.push({ sql: 'DELETE FROM users WHERE id = ? AND role = ?', args: [userId, role] })
  await db.batch(statements)
}

export async function resetDatabase(db: Client): Promise<void> {
  await db.batch([
    { sql: 'DELETE FROM attendance', args: [] },
    { sql: 'DELETE FROM sessions', args: [] },
    { sql: 'DELETE FROM math_sessions', args: [] },
    { sql: 'DELETE FROM math_attempts', args: [] },
    { sql: 'DELETE FROM math_exam_attempts', args: [] },
    { sql: 'DELETE FROM math_exam_section_progress', args: [] },
    { sql: 'DELETE FROM math_progress', args: [] },
    { sql: 'DELETE FROM activity_log', args: [] },
    { sql: 'DELETE FROM teaching_sessions', args: [] },
    { sql: 'DELETE FROM module_progress', args: [] },
    { sql: 'DELETE FROM vocab_progress', args: [] },
    { sql: 'DELETE FROM admin_email_verifications', args: [] },
    { sql: 'DELETE FROM admin_email_allowlist', args: [] },
    { sql: 'DELETE FROM student_settings', args: [] },
    { sql: 'DELETE FROM student_tutors', args: [] },
    { sql: 'DELETE FROM user_tracks', args: [] },
    { sql: 'DELETE FROM users', args: [] },
  ])
  await seedDefaultAdminAllowlist(db)
  await seedTestAccounts(db)
}
