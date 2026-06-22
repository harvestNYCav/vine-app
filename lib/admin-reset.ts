import type { Client } from '@libsql/client'
import { normalizeEmail } from './email-verification'

export const DEFAULT_ADMIN_EMAIL_ALLOWLIST = [
  'julianahhong@gmail.com',
  'richaguir@gmail.com',
  'harvestinthecitynyc@gmail.com',
  'shichengrao@gmail.com',
  'VineAdmin@harvest-nyc.com',
  'aldowiloto@gmail.com',
]

export async function seedDefaultAdminAllowlist(db: Client, createdBy = 'system'): Promise<void> {
  const now = Date.now()
  await db.batch(DEFAULT_ADMIN_EMAIL_ALLOWLIST.map(email => ({
    sql: `
      INSERT INTO admin_email_allowlist (email, created_by, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        created_by = excluded.created_by,
        created_at = excluded.created_at
    `,
    args: [normalizeEmail(email), createdBy, now],
  })))
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
}
