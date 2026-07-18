import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { normalizePersonName } from '../lib/names'
import {
  createStudentAccount,
  loginCanCreateMissingAccount,
  validateNewStudentAccount,
} from '../lib/student-accounts'

test('login display names use the canonical spacing shown by the account', () => {
  assert.equal(normalizePersonName('  Bea   Chen   '), 'Bea Chen')
})

test('student account input trims and collapses whitespace while preserving a 4-digit PIN', () => {
  assert.deepEqual(
    validateNewStudentAccount({ name: '  Maria   Lopez  ', pin: '0042' }),
    { ok: true, account: { name: 'Maria Lopez', pin: '0042' } },
  )
  assert.deepEqual(
    validateNewStudentAccount({ name: 'Maria', pin: '42' }),
    { ok: false, error: 'PIN must be exactly 4 digits.' },
  )
})

test('missing student accounts cannot be created by login', () => {
  assert.equal(loginCanCreateMissingAccount('student'), false)
  assert.equal(loginCanCreateMissingAccount('tutor'), true)
  assert.equal(loginCanCreateMissingAccount('admin'), true)
})

test('admin provisioning hashes the PIN and atomically rejects case and whitespace conflicts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-student-account-'))
  const db = createClient({ url: `file:${join(directory, 'accounts.db')}` })

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

    const attempts = await Promise.all([
      createStudentAccount(db, { name: 'Jamie  Chen', pin: '1234' }),
      createStudentAccount(db, { name: ' jamie chen ', pin: '2345' }),
      createStudentAccount(db, { name: 'JAMIE   CHEN', pin: '3456' }),
    ])
    assert.equal(attempts.filter(result => result.ok).length, 1)
    assert.equal(attempts.filter(result => !result.ok && result.reason === 'conflict').length, 2)

    const stored = await db.execute({
      sql: "SELECT name, pin_hash, last_active FROM users WHERE role = 'student'",
      args: [],
    })
    assert.equal(stored.rows.length, 1)
    assert.equal(String(stored.rows[0].name), 'Jamie Chen')
    assert.equal(Number(stored.rows[0].last_active), 0)
    assert.equal(String(stored.rows[0].pin_hash).includes('1234'), false)

    const successfulAttemptIndex = attempts.findIndex(result => result.ok)
    const successfulPin = ['1234', '2345', '3456'][successfulAttemptIndex]
    assert.equal(await bcrypt.compare(successfulPin, String(stored.rows[0].pin_hash)), true)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
