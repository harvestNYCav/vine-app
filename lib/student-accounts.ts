import type { Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import type { Role } from '@/types'
import { normalizePersonName } from './names'

const MAX_STUDENT_NAME_LENGTH = 80
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export type NewStudentAccount = {
  name: string
  pin: string
}

export type CreateStudentAccountResult =
  | {
      ok: true
      student: { id: string; name: string; createdAt: number }
    }
  | {
      ok: false
      reason: 'invalid' | 'conflict'
      error: string
    }

export function normalizeStudentName(value: string): string {
  return normalizePersonName(value)
}

function studentNameKey(value: string): string {
  return normalizeStudentName(value).toLowerCase()
}

export function validateNewStudentAccount(value: unknown):
  | { ok: true; account: NewStudentAccount }
  | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Enter a student name and 4-digit PIN.' }
  }

  const { name: rawName, pin } = value as Record<string, unknown>
  const name = typeof rawName === 'string' ? normalizeStudentName(rawName) : ''

  if (
    name.length < 2
    || name.length > MAX_STUDENT_NAME_LENGTH
    || (typeof rawName === 'string' && CONTROL_CHARACTER.test(rawName))
  ) {
    return { ok: false, error: 'Student name must be between 2 and 80 characters.' }
  }
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: 'PIN must be exactly 4 digits.' }
  }

  return { ok: true, account: { name, pin } }
}

export function loginCanCreateMissingAccount(role: Role): boolean {
  return role !== 'student'
}

export async function createStudentAccount(
  db: Client,
  value: unknown,
): Promise<CreateStudentAccountResult> {
  const validation = validateNewStudentAccount(value)
  if (!validation.ok) {
    return { ok: false, reason: 'invalid', error: validation.error }
  }

  const { name, pin } = validation.account
  const id = randomUUID()
  const now = Date.now()
  const pinHash = await bcrypt.hash(pin, 10)
  const transaction = await db.transaction('write')
  try {
    const existingResult = await transaction.execute({
      sql: "SELECT name FROM users WHERE role = 'student'",
      args: [],
    })
    const existing = existingResult.rows.find(row => (
      studentNameKey(String(row.name)) === studentNameKey(name)
    ))
    if (existing) {
      return {
        ok: false,
        reason: 'conflict',
        error: `A student named "${String(existing.name)}" already exists.`,
      }
    }

    await transaction.execute({
      sql: `
        INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
        VALUES (?, ?, NULL, ?, 'student', ?, 0)
      `,
      args: [id, name, pinHash, now],
    })
    await transaction.commit()
  } finally {
    transaction.close()
  }

  return { ok: true, student: { id, name, createdAt: now } }
}
