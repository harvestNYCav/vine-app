import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import {
  createParentAccount,
  parentChildCookieName,
  selectParentChildId,
  validateNewParentAccount,
} from '../lib/parents'
import { loginCanCreateMissingAccount } from '../lib/student-accounts'

const children = [
  { id: 'student-1', name: 'Amina' },
  { id: 'student-2', name: 'Diego' },
]

test('parent account input trims the name and requires a 4-digit PIN', () => {
  assert.deepEqual(
    validateNewParentAccount({ name: '  Ana   Lopez  ', pin: '0042' }),
    { ok: true, account: { name: 'Ana Lopez', pin: '0042' } },
  )
  assert.deepEqual(
    validateNewParentAccount({ name: 'Ana Lopez', pin: '42' }),
    { ok: false, error: 'PIN must be exactly 4 digits.' },
  )
})

test('missing parent accounts cannot be created by login', () => {
  assert.equal(loginCanCreateMissingAccount('parent'), false)
})

test('the viewed child falls back to the first link when the remembered one is gone', () => {
  assert.equal(selectParentChildId(children, 'student-2'), 'student-2')
  assert.equal(selectParentChildId(children, 'student-unlinked'), 'student-1')
  assert.equal(selectParentChildId(children, undefined), 'student-1')
  assert.equal(selectParentChildId([], 'student-1'), null)
})

test('the viewed-child cookie is namespaced per parent on a shared device', () => {
  assert.notEqual(parentChildCookieName('parent-1'), parentChildCookieName('parent-2'))
  assert.match(parentChildCookieName('parent-1'), /^vine_parent_child_/)
})

test('parent provisioning hashes the PIN and rejects case and whitespace conflicts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-parent-account-'))
  const db = createClient({ url: `file:${join(directory, 'parents.db')}` })

  try {
    await db.executeMultiple(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL
      );
    `)

    const created = await createParentAccount(db, { name: 'Ana Lopez', pin: '4321' })
    assert.equal(created.ok, true)

    const stored = await db.execute({ sql: 'SELECT name, pin_hash, role FROM users', args: [] })
    assert.equal(String(stored.rows[0].name), 'Ana Lopez')
    assert.equal(String(stored.rows[0].role), 'parent')
    assert.notEqual(String(stored.rows[0].pin_hash), '4321')
    assert.equal(await bcrypt.compare('4321', String(stored.rows[0].pin_hash)), true)

    const duplicate = await createParentAccount(db, { name: '  ana   lopez ', pin: '1111' })
    assert.equal(duplicate.ok, false)
    assert.equal(duplicate.ok === false && duplicate.reason, 'conflict')

    const stillOne = await db.execute({ sql: 'SELECT COUNT(*) as count FROM users', args: [] })
    assert.equal(Number(stillOne.rows[0].count), 1)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
