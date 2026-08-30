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

    const candidates = [
      { name: 'Jamie  Chen', pin: '1234', stored: 'Jamie Chen' },
      { name: ' jamie chen ', pin: '2345', stored: 'jamie chen' },
      { name: 'JAMIE   CHEN', pin: '3456', stored: 'JAMIE CHEN' },
    ]
    const attempts = await Promise.all(
      candidates.map(candidate => createStudentAccount(db, { name: candidate.name, pin: candidate.pin })),
    )
    assert.equal(attempts.filter(result => result.ok).length, 1)
    assert.equal(attempts.filter(result => !result.ok && result.reason === 'conflict').length, 2)

    const stored = await db.execute({
      sql: "SELECT name, pin_hash, last_active FROM users WHERE role = 'student'",
      args: [],
    })
    assert.equal(stored.rows.length, 1)

    // Which attempt reaches the write lock first is up to the scheduler, so the
    // assertions follow the winner. Whoever wins keeps their own capitalisation
    // with whitespace collapsed; the other two are rejected case-insensitively
    // instead of overwriting it.
    const winner = candidates[attempts.findIndex(result => result.ok)]
    assert.equal(String(stored.rows[0].name), winner.stored)
    assert.equal(Number(stored.rows[0].last_active), 0)
    assert.equal(String(stored.rows[0].pin_hash).includes(winner.pin), false)
    assert.equal(await bcrypt.compare(winner.pin, String(stored.rows[0].pin_hash)), true)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
