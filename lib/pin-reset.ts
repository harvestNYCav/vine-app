import type { Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { PIN_LENGTH } from './pin-entry'

/**
 * Roles an admin may set a new PIN for. Admins are excluded on purpose: their
 * own PIN is only half of their sign-in, and letting one admin overwrite
 * another's would be a takeover rather than a password reset.
 */
export const PIN_RESET_ROLES = ['student', 'tutor', 'parent'] as const

export type PinResetRole = (typeof PIN_RESET_ROLES)[number]

export type PinResetRequest = { userId: string; pin: string }

export type PinResetResult =
  | { ok: true; user: { id: string; name: string; role: PinResetRole } }
  | { ok: false; reason: 'invalid' | 'not_found'; error: string }

export function isPinResetRole(value: unknown): value is PinResetRole {
  return PIN_RESET_ROLES.includes(value as PinResetRole)
}

export function validatePinReset(value: unknown):
  | { ok: true; request: PinResetRequest }
  | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Choose a profile and a new PIN.' }
  }

  const { userId, pin } = value as Record<string, unknown>
  if (typeof userId !== 'string' || userId.length === 0) {
    return { ok: false, error: 'Choose a profile to reset.' }
  }
  if (typeof pin !== 'string' || !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return { ok: false, error: `PIN must be exactly ${PIN_LENGTH} digits.` }
  }

  return { ok: true, request: { userId, pin } }
}

export async function resetUserPin(db: Client, value: unknown): Promise<PinResetResult> {
  const validation = validatePinReset(value)
  if (!validation.ok) {
    return { ok: false, reason: 'invalid', error: validation.error }
  }

  const { userId, pin } = validation.request
  const placeholders = PIN_RESET_ROLES.map(() => '?').join(',')
  const userResult = await db.execute({
    sql: `SELECT id, name, role FROM users WHERE id = ? AND role IN (${placeholders})`,
    args: [userId, ...PIN_RESET_ROLES],
  })
  const row = userResult.rows[0]
  if (!row) {
    return { ok: false, reason: 'not_found', error: 'Student, tutor or parent profile not found.' }
  }

  const pinHash = await bcrypt.hash(pin, 10)
  await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
    args: [pinHash, userId],
  })

  return {
    ok: true,
    user: { id: String(row.id), name: String(row.name), role: String(row.role) as PinResetRole },
  }
}
