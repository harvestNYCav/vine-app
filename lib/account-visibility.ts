import type { Client } from '@libsql/client'

// Two ways an admin keeps an account out of the way without deleting it.
//
// - A **test account** (a student, tutor or parent) was made to try the app out, for example to see
//   the student or tutor view. It never counts: the admin page's tiles and the Impact page leave it
//   out, and the admin pages hide it unless "Show test accounts" is on.
// - A **paused student** is away for a while (out for a semester, say). They drop off the admin
//   page's list and its counts, and off the Impact page's "check in on" list, until they are back.
//   A pause ends by itself on its "back on" date, if one was set, or as soon as the student signs in
//   or a tutor marks them present. What they did before the pause still counts toward the weeks it
//   happened in, and the Impact page lists them (marked Paused) for those weeks only.
//
// Both live on `users` (`is_test`, `paused_on`, `paused_until`; see lib/db.ts). Dates are
// program-local `YYYY-MM-DD` keys, like every other daily record.

export const SHOW_TEST_ACCOUNTS_COOKIE = 'vine_admin_show_test_accounts'

export type FlaggableRole = 'student' | 'tutor' | 'parent'

export function showTestAccountsFromCookie(value: string | undefined): boolean {
  return value === '1'
}

// Before accounts could be flagged, the Impact page treated names starting with "Test"
// ("TestStudentESL", "TestTutor") as test accounts. Existing accounts named that way are flagged
// once when the column is added, and the admin page suggests flagging any created since.
export function looksLikeTestAccountName(name: string): boolean {
  return /^test/i.test(name.trim())
}

export interface PauseState {
  pausedOn: string | null
  pausedUntil: string | null
}

export function pauseStateFromRow(row: { readonly [column: string]: unknown }): PauseState {
  const key = (value: unknown) => typeof value === 'string' && isDateKey(value) ? value : null
  return { pausedOn: key(row.paused_on), pausedUntil: key(row.paused_until) }
}

// Paused from `pausedOn` until the day before `pausedUntil`; on the "back on" date they count again.
export function isPaused(state: PauseState, today: string): boolean {
  if (state.pausedOn === null) return false
  return state.pausedUntil === null || today < state.pausedUntil
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function validatePauseUntil(
  value: unknown,
  today: string,
): { ok: true; until: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined || value === '') return { ok: true, until: null }
  if (typeof value !== 'string' || !isDateKey(value)) {
    return { ok: false, error: 'The back-on date must be a date like 2027-01-25.' }
  }
  if (value <= today) return { ok: false, error: 'The back-on date must be after today.' }
  return { ok: true, until: value }
}

export async function setTestAccount(
  db: Client,
  userId: string,
  isTest: boolean,
): Promise<{ id: string; name: string; role: FlaggableRole } | null> {
  const found = await db.execute({
    sql: "SELECT id, name, role FROM users WHERE id = ? AND role IN ('student', 'tutor', 'parent')",
    args: [userId],
  })
  const row = found.rows[0]
  if (!row) return null
  await db.execute({ sql: 'UPDATE users SET is_test = ? WHERE id = ?', args: [isTest ? 1 : 0, userId] })
  return { id: String(row.id), name: String(row.name), role: String(row.role) as FlaggableRole }
}

// Pauses a student, or changes the back-on date of a pause already running (keeping when it began).
export async function pauseStudent(
  db: Client,
  studentId: string,
  { today, until }: { today: string; until: string | null },
): Promise<boolean> {
  const found = await db.execute({
    sql: "SELECT paused_on, paused_until FROM users WHERE id = ? AND role = 'student'",
    args: [studentId],
  })
  const row = found.rows[0]
  if (!row) return false
  const current = pauseStateFromRow(row)
  const pausedOn = isPaused(current, today) ? current.pausedOn : today
  await db.execute({
    sql: 'UPDATE users SET paused_on = ?, paused_until = ? WHERE id = ?',
    args: [pausedOn, until, studentId],
  })
  return true
}

export async function resumeStudent(db: Client, studentId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE users SET paused_on = NULL, paused_until = NULL WHERE id = ? AND role = 'student'",
    args: [studentId],
  })
  return result.rowsAffected > 0
}

// A paused student who turns up again is back. Called when a student signs in (with today) and
// when a tutor marks them present (with that session's date, so marking an old session doesn't
// undo a pause that began after it).
export async function resumeStudentOnReturn(db: Client, studentId: string, date: string): Promise<void> {
  await db.execute({
    sql: `UPDATE users SET paused_on = NULL, paused_until = NULL
          WHERE id = ? AND role = 'student' AND paused_on IS NOT NULL AND paused_on <= ?`,
    args: [studentId, date],
  })
}

export const FLAG_TEST_ACCOUNTS_BY_NAME_MIGRATION = '2026-11-21-flag-test-accounts-by-name'

export async function flagTestAccountsByNameOnce(db: Client): Promise<void> {
  const existing = await db.execute({
    sql: 'SELECT 1 FROM schema_migrations WHERE name = ?',
    args: [FLAG_TEST_ACCOUNTS_BY_NAME_MIGRATION],
  })
  if (existing.rows.length > 0) return
  await db.batch([
    {
      // LIKE is case-insensitive for ASCII, matching looksLikeTestAccountName.
      sql: `UPDATE users SET is_test = 1
            WHERE role IN ('student', 'tutor', 'parent') AND LTRIM(name) LIKE 'test%'`,
      args: [],
    },
    {
      sql: 'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?) ON CONFLICT(name) DO NOTHING',
      args: [FLAG_TEST_ACCOUNTS_BY_NAME_MIGRATION, Date.now()],
    },
  ], 'write')
}

// "Jan 26", or "Jan 26, 2027" outside `today`'s year, for a `YYYY-MM-DD` key.
export function formatDayKey(key: string, today: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(String(year) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

export function nextDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}
