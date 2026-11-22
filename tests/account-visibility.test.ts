import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  flagTestAccountsByNameOnce,
  formatDayKey,
  isPaused,
  looksLikeTestAccountName,
  nextDayKey,
  pauseStudent,
  resumeStudent,
  resumeStudentOnReturn,
  setTestAccount,
  showTestAccountsFromCookie,
  validatePauseUntil,
} from '../lib/account-visibility'

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-account-visibility-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
        is_test INTEGER NOT NULL DEFAULT 0, paused_on TEXT, paused_until TEXT
      );
      CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
      INSERT INTO users (id, name, role) VALUES
        ('ana', 'Ana', 'student'), ('tst', 'TestStudentESL', 'student'), ('tt', ' testtutor', 'tutor'),
        ('tp', 'TestParent', 'parent'), ('adm', 'test@example.org', 'admin'), ('sarah', 'Sarah', 'tutor');
    `)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

const pausedIds = async (db: Client) =>
  (await db.execute('SELECT id FROM users WHERE paused_on IS NOT NULL ORDER BY id')).rows.map(row => String(row.id))

test('a pause runs until the day before its back-on date, or until it is lifted', () => {
  assert.equal(isPaused({ pausedOn: null, pausedUntil: null }, '2026-11-21'), false)
  assert.equal(isPaused({ pausedOn: '2026-11-21', pausedUntil: null }, '2027-06-01'), true)
  assert.equal(isPaused({ pausedOn: '2026-11-21', pausedUntil: '2027-01-25' }, '2027-01-24'), true)
  assert.equal(isPaused({ pausedOn: '2026-11-21', pausedUntil: '2027-01-25' }, '2027-01-25'), false)
})

test('the back-on date is optional, but must be a real date after today', () => {
  assert.deepEqual(validatePauseUntil(null, '2026-11-21'), { ok: true, until: null })
  assert.deepEqual(validatePauseUntil('', '2026-11-21'), { ok: true, until: null })
  assert.deepEqual(validatePauseUntil('2027-01-25', '2026-11-21'), { ok: true, until: '2027-01-25' })
  assert.equal(validatePauseUntil('2026-11-21', '2026-11-21').ok, false)
  assert.equal(validatePauseUntil('2027-02-30', '2026-11-21').ok, false)
  assert.equal(validatePauseUntil('next month', '2026-11-21').ok, false)
})

test('dates and the show-test-accounts cookie read the way the admin page expects', () => {
  assert.equal(formatDayKey('2026-12-05', '2026-11-21'), 'Dec 5')
  assert.equal(formatDayKey('2027-01-25', '2026-11-21'), 'Jan 25, 2027')
  assert.equal(nextDayKey('2026-12-31'), '2027-01-01')
  assert.equal(showTestAccountsFromCookie('1'), true)
  assert.equal(showTestAccountsFromCookie(undefined), false)
  assert.equal(looksLikeTestAccountName(' testtutor'), true)
  assert.equal(looksLikeTestAccountName('Teresa'), false)
})

test('existing accounts named "Test…" are flagged once, and admins never are', async () => {
  await withFixture(async db => {
    await flagTestAccountsByNameOnce(db)
    const flagged = await db.execute('SELECT id FROM users WHERE is_test = 1 ORDER BY id')
    assert.deepEqual(flagged.rows.map(row => String(row.id)), ['tp', 'tst', 'tt'])

    // Unflagging sticks: the migration does not run again.
    await setTestAccount(db, 'tst', false)
    await flagTestAccountsByNameOnce(db)
    const again = await db.execute("SELECT is_test FROM users WHERE id = 'tst'")
    assert.equal(Number(again.rows[0].is_test), 0)
  })
})

test('only students, tutors and parents can be marked as test accounts', async () => {
  await withFixture(async db => {
    assert.deepEqual(await setTestAccount(db, 'sarah', true), { id: 'sarah', name: 'Sarah', role: 'tutor' })
    assert.equal(await setTestAccount(db, 'adm', true), null)
    assert.equal(await setTestAccount(db, 'missing', true), null)
  })
})

test('changing the back-on date keeps when the pause began', async () => {
  await withFixture(async db => {
    assert.equal(await pauseStudent(db, 'ana', { today: '2026-11-21', until: null }), true)
    assert.equal(await pauseStudent(db, 'ana', { today: '2026-12-01', until: '2027-01-25' }), true)
    const row = (await db.execute("SELECT paused_on, paused_until FROM users WHERE id = 'ana'")).rows[0]
    assert.deepEqual([row.paused_on, row.paused_until], ['2026-11-21', '2027-01-25'])

    // Only students can be paused.
    assert.equal(await pauseStudent(db, 'sarah', { today: '2026-11-21', until: null }), false)
    assert.equal(await resumeStudent(db, 'sarah'), false)

    assert.equal(await resumeStudent(db, 'ana'), true)
    assert.deepEqual(await pausedIds(db), [])
  })
})

test('a pause that already ended starts over from today', async () => {
  await withFixture(async db => {
    await db.execute("UPDATE users SET paused_on = '2026-01-10', paused_until = '2026-06-01' WHERE id = 'ana'")
    await pauseStudent(db, 'ana', { today: '2026-11-21', until: null })
    const row = (await db.execute("SELECT paused_on, paused_until FROM users WHERE id = 'ana'")).rows[0]
    assert.deepEqual([row.paused_on, row.paused_until], ['2026-11-21', null])
  })
})

test('a paused student who turns up on or after the pause began is back', async () => {
  await withFixture(async db => {
    await pauseStudent(db, 'ana', { today: '2026-11-21', until: '2027-01-25' })
    await resumeStudentOnReturn(db, 'ana', '2026-11-14')
    assert.deepEqual(await pausedIds(db), ['ana'], 'an earlier session does not end the pause')
    await resumeStudentOnReturn(db, 'ana', '2026-12-05')
    assert.deepEqual(await pausedIds(db), [])
  })
})
