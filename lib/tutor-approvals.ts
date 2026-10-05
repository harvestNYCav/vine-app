import type { Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

// A tutor who signs up at the PIN pad waits here until an admin approves them. They only
// become a `users` row on approval, so a pending tutor can never get a session or appear in
// a roster, check-in list or assignment picker.
export const TUTOR_SIGNUP_REQUESTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tutor_signup_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    pin_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`

export interface TutorSignupRequest {
  id: string
  name: string
  createdAt: number
}

export type TutorApprovalResult =
  | { ok: true; tutor: { id: string; name: string } }
  | { ok: false; reason: 'not_found' | 'conflict'; error: string }

/**
 * Called when a tutor signs in under a name that is not an account yet. The first
 * sign-in records the request; later ones with the same name and PIN learn it is
 * still waiting. A different PIN is refused rather than replacing the waiting one,
 * so nobody else can take over a request by typing the same name.
 */
export async function requestTutorSignup(
  db: Client,
  name: string,
  pin: string,
): Promise<'pending' | 'wrong_pin'> {
  await db.execute({
    sql: `
      INSERT INTO tutor_signup_requests (id, name, pin_hash, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO NOTHING
    `,
    args: [randomUUID(), name, await bcrypt.hash(pin, 10), Date.now()],
  })
  const result = await db.execute({
    sql: 'SELECT pin_hash FROM tutor_signup_requests WHERE name = ?',
    args: [name],
  })
  const pinHash = result.rows[0]?.pin_hash
  return pinHash && await bcrypt.compare(pin, String(pinHash)) ? 'pending' : 'wrong_pin'
}

export async function listTutorSignupRequests(db: Client): Promise<TutorSignupRequest[]> {
  const result = await db.execute({
    sql: 'SELECT id, name, created_at FROM tutor_signup_requests ORDER BY created_at',
    args: [],
  })
  return result.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    createdAt: Number(row.created_at),
  }))
}

/** Turns a waiting request into a tutor account that signs in with the PIN they chose. */
export async function approveTutorSignup(db: Client, requestId: string): Promise<TutorApprovalResult> {
  const transaction = await db.transaction('write')
  try {
    const requestResult = await transaction.execute({
      sql: 'SELECT name, pin_hash FROM tutor_signup_requests WHERE id = ?',
      args: [requestId],
    })
    const request = requestResult.rows[0]
    if (!request) {
      return { ok: false, reason: 'not_found', error: 'That tutor request was already handled.' }
    }

    const name = String(request.name)
    const existing = await transaction.execute({
      sql: "SELECT id FROM users WHERE role = 'tutor' AND LOWER(name) = LOWER(?)",
      args: [name],
    })
    if (existing.rows[0]) {
      return { ok: false, reason: 'conflict', error: `A tutor named "${name}" already exists.` }
    }

    const id = randomUUID()
    await transaction.batch([
      {
        sql: `
          INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
          VALUES (?, ?, NULL, ?, 'tutor', ?, 0)
        `,
        args: [id, name, String(request.pin_hash), Date.now()],
      },
      { sql: 'DELETE FROM tutor_signup_requests WHERE id = ?', args: [requestId] },
    ])
    await transaction.commit()
    return { ok: true, tutor: { id, name } }
  } finally {
    transaction.close()
  }
}

/** Discards a request. The person can sign up again later, which starts a new one. */
export async function declineTutorSignup(db: Client, requestId: string): Promise<boolean> {
  const result = await db.execute({
    sql: 'DELETE FROM tutor_signup_requests WHERE id = ?',
    args: [requestId],
  })
  return result.rowsAffected > 0
}
