import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { isPinResetRole, resetUserPin, validatePinReset } from '../lib/pin-reset'

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-pin-reset-'))
  const db = createClient({ url: `file:${join(directory, 'pins.db')}` })
  try {
    const oldHash = await bcrypt.hash('1111', 10)
    await db.executeMultiple(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        role TEXT NOT NULL
      );
      INSERT INTO users (id, name, pin_hash, role) VALUES ('student-1', 'Amina', '${oldHash}', 'student');
      INSERT INTO users (id, name, pin_hash, role) VALUES ('parent-1', 'Ana', '${oldHash}', 'parent');
      INSERT INTO users (id, name, pin_hash, role) VALUES ('admin-1', 'Root', '${oldHash}', 'admin');
    `)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

test('a reset needs a profile and a 4-digit PIN', () => {
  assert.deepEqual(
    validatePinReset({ userId: 'student-1', pin: '0420' }),
    { ok: true, request: { userId: 'student-1', pin: '0420' } },
  )
  assert.equal(validatePinReset({ userId: '', pin: '0420' }).ok, false)
  assert.equal(validatePinReset({ userId: 'student-1', pin: '42' }).ok, false)
  assert.equal(validatePinReset({ userId: 'student-1', pin: 'abcd' }).ok, false)
  assert.equal(validatePinReset(null).ok, false)
})

test('the new PIN is stored hashed and the old one stops working', async () => {
  await withFixture(async db => {
    const result = await resetUserPin(db, { userId: 'student-1', pin: '0420' })
    assert.equal(result.ok, true)
    assert.equal(result.ok === true && result.user.name, 'Amina')

    const stored = await db.execute({ sql: 'SELECT pin_hash FROM users WHERE id = ?', args: ['student-1'] })
    const hash = String(stored.rows[0].pin_hash)
    assert.notEqual(hash, '0420')
    assert.equal(await bcrypt.compare('0420', hash), true)
    assert.equal(await bcrypt.compare('1111', hash), false)
  })
})

test('parents can be reset, and only the chosen profile changes', async () => {
  await withFixture(async db => {
    const before = await db.execute({ sql: "SELECT pin_hash FROM users WHERE id = 'student-1'", args: [] })
    const result = await resetUserPin(db, { userId: 'parent-1', pin: '9876' })
    assert.equal(result.ok, true)

    const after = await db.execute({ sql: "SELECT pin_hash FROM users WHERE id = 'student-1'", args: [] })
    assert.equal(String(after.rows[0].pin_hash), String(before.rows[0].pin_hash))
  })
})

test('an admin PIN cannot be overwritten by another admin', async () => {
  await withFixture(async db => {
    const result = await resetUserPin(db, { userId: 'admin-1', pin: '0420' })
    assert.equal(result.ok, false)
    assert.equal(result.ok === false && result.reason, 'not_found')

    const stored = await db.execute({ sql: "SELECT pin_hash FROM users WHERE id = 'admin-1'", args: [] })
    assert.equal(await bcrypt.compare('1111', String(stored.rows[0].pin_hash)), true)
  })
})

test('an unknown profile is reported rather than silently ignored', async () => {
  await withFixture(async db => {
    const result = await resetUserPin(db, { userId: 'nobody', pin: '0420' })
    assert.equal(result.ok, false)
    assert.equal(result.ok === false && result.reason, 'not_found')
  })
})

test('only student, tutor and parent count as resettable roles', () => {
  assert.equal(isPinResetRole('student'), true)
  assert.equal(isPinResetRole('parent'), true)
  assert.equal(isPinResetRole('tutor'), true)
  assert.equal(isPinResetRole('admin'), false)
})
