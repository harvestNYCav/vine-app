import type { Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { normalizePersonName } from './names'

const MAX_PARENT_NAME_LENGTH = 80
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/
const PARENT_CHILD_COOKIE_PREFIX = 'vine_parent_child_'

export interface ParentChild {
  id: string
  name: string
}

export interface ParentSettings {
  spanishEnabled: boolean
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = { spanishEnabled: false }

export type NewParentAccount = {
  name: string
  pin: string
}

export type CreateParentAccountResult =
  | { ok: true; parent: { id: string; name: string; createdAt: number } }
  | { ok: false; reason: 'invalid' | 'conflict'; error: string }

export function parentChildCookieName(parentId: string): string {
  const safeParentId = parentId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `${PARENT_CHILD_COOKIE_PREFIX}${safeParentId}`
}

/**
 * A parent can be linked to more than one student, so the mirrored view needs a
 * single subject. A remembered choice only counts while that link still exists;
 * otherwise the first linked student is shown.
 */
export function selectParentChildId(children: ParentChild[], requestedId: unknown): string | null {
  if (children.length === 0) return null
  if (typeof requestedId === 'string' && children.some(child => child.id === requestedId)) {
    return requestedId
  }
  return children[0].id
}

function parentNameKey(value: string): string {
  return normalizePersonName(value).toLowerCase()
}

export function validateNewParentAccount(value: unknown):
  | { ok: true; account: NewParentAccount }
  | { ok: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Enter a parent name and 4-digit PIN.' }
  }

  const { name: rawName, pin } = value as Record<string, unknown>
  const name = typeof rawName === 'string' ? normalizePersonName(rawName) : ''

  if (
    name.length < 2
    || name.length > MAX_PARENT_NAME_LENGTH
    || (typeof rawName === 'string' && CONTROL_CHARACTER.test(rawName))
  ) {
    return { ok: false, error: 'Parent name must be between 2 and 80 characters.' }
  }
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: 'PIN must be exactly 4 digits.' }
  }

  return { ok: true, account: { name, pin } }
}

export async function createParentAccount(db: Client, value: unknown): Promise<CreateParentAccountResult> {
  const validation = validateNewParentAccount(value)
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
      sql: "SELECT name FROM users WHERE role = 'parent'",
      args: [],
    })
    const existing = existingResult.rows.find(row => parentNameKey(String(row.name)) === parentNameKey(name))
    if (existing) {
      return {
        ok: false,
        reason: 'conflict',
        error: `A parent named "${String(existing.name)}" already exists.`,
      }
    }

    await transaction.execute({
      sql: `
        INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
        VALUES (?, ?, NULL, ?, 'parent', ?, 0)
      `,
      args: [id, name, pinHash, now],
    })
    await transaction.commit()
  } finally {
    transaction.close()
  }

  return { ok: true, parent: { id, name, createdAt: now } }
}

export async function getParentChildren(db: Client, parentId: string): Promise<ParentChild[]> {
  const result = await db.execute({
    sql: `
      SELECT users.id, users.name
      FROM parent_students
      JOIN users ON users.id = parent_students.student_id AND users.role = 'student'
      WHERE parent_students.parent_id = ?
      ORDER BY users.name
    `,
    args: [parentId],
  })
  return result.rows.map(row => ({ id: String(row.id), name: String(row.name) }))
}

export async function setParentChildren(db: Client, parentId: string, studentIds: string[]): Promise<void> {
  const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))]
  const now = Date.now()
  await db.batch([
    { sql: 'DELETE FROM parent_students WHERE parent_id = ?', args: [parentId] },
    ...uniqueStudentIds.map(studentId => ({
      sql: 'INSERT INTO parent_students (parent_id, student_id, created_at) VALUES (?, ?, ?)',
      args: [parentId, studentId, now],
    })),
  ], 'write')
}

export async function getParentSettings(db: Client, parentId: string): Promise<ParentSettings> {
  const result = await db.execute({
    sql: 'SELECT spanish_enabled FROM parent_settings WHERE user_id = ?',
    args: [parentId],
  })
  const row = result.rows[0]
  if (!row) return DEFAULT_PARENT_SETTINGS
  return { spanishEnabled: Number(row.spanish_enabled) === 1 }
}

export async function setParentSettings(db: Client, parentId: string, settings: ParentSettings): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO parent_settings (user_id, spanish_enabled, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        spanish_enabled = excluded.spanish_enabled,
        updated_at = excluded.updated_at
    `,
    args: [parentId, settings.spanishEnabled ? 1 : 0, Date.now()],
  })
}

export interface AdminParentRow {
  id: string
  name: string
  lastActive: number
  childIds: string[]
  spanishEnabled: boolean
}

export async function listParentsForAdmin(db: Client): Promise<AdminParentRow[]> {
  const [parentsResult, linksResult, settingsResult] = await Promise.all([
    db.execute({ sql: "SELECT id, name, last_active FROM users WHERE role = 'parent' ORDER BY name", args: [] }),
    db.execute({ sql: 'SELECT parent_id, student_id FROM parent_students', args: [] }),
    db.execute({ sql: 'SELECT user_id, spanish_enabled FROM parent_settings', args: [] }),
  ])

  const childIdsByParent = new Map<string, string[]>()
  for (const row of linksResult.rows) {
    const parentId = String(row.parent_id)
    if (!childIdsByParent.has(parentId)) childIdsByParent.set(parentId, [])
    childIdsByParent.get(parentId)!.push(String(row.student_id))
  }
  const spanishByParent = new Map(
    settingsResult.rows.map(row => [String(row.user_id), Number(row.spanish_enabled) === 1]),
  )

  return parentsResult.rows.map(row => {
    const id = String(row.id)
    return {
      id,
      name: String(row.name),
      lastActive: Number(row.last_active),
      childIds: childIdsByParent.get(id) ?? [],
      spanishEnabled: spanishByParent.get(id) ?? false,
    }
  })
}
