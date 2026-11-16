import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

// getDb caches one client per process and seeds the allowlist the first time it
// runs, so ADMIN_EMAILS has to be set before anything opens the database.
const directory = mkdtempSync(join(tmpdir(), 'vine-admin-allowlist-'))
const previousAdminEmails = process.env.ADMIN_EMAILS
process.env.TURSO_DATABASE_URL = `file:${join(directory, 'allowlist.db')}`
process.env.ADMIN_EMAILS = ' Approved.One@Example.com, approved.two@example.com\nnot-an-email,,approved.one@example.com '

const EMAIL_ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

after(() => {
  delete process.env.TURSO_DATABASE_URL
  if (previousAdminEmails === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = previousAdminEmails
  rmSync(directory, { recursive: true, force: true })
})

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function allowlist(): Promise<string[]> {
  const { default: getDb } = await import('../lib/db')
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT email FROM admin_email_allowlist ORDER BY email', args: [] })
  return result.rows.map(row => String(row.email))
}

test('no admin email address is written into the source', () => {
  // The admin list used to be hard-coded in lib/admin-allowlist.ts, in a public
  // repo. It now comes from ADMIN_EMAILS, so these files hold no address at all.
  for (const file of ['lib/admin-allowlist.ts', 'lib/db.ts', 'lib/admin-reset.ts']) {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    assert.deepEqual(source.match(EMAIL_ADDRESS) ?? [], [], `${file} must not contain email addresses; set ADMIN_EMAILS instead`)
  }
})

test('ADMIN_EMAILS is read as a trimmed, lowercased, de-duplicated list of valid emails', async () => {
  const { configuredAdminEmails } = await import('../lib/admin-allowlist')
  assert.deepEqual(configuredAdminEmails(), ['approved.one@example.com', 'approved.two@example.com'])
  assert.deepEqual(configuredAdminEmails('a@example.com;b@example.com c@example.com'), [
    'a@example.com',
    'b@example.com',
    'c@example.com',
  ])
  assert.deepEqual(configuredAdminEmails(''), [])
})

test('a new database seeds the allowlist from ADMIN_EMAILS', async () => {
  assert.deepEqual(await allowlist(), ['approved.one@example.com', 'approved.two@example.com'])
})

test('an email from ADMIN_EMAILS can still sign up once another admin exists', async () => {
  const [{ POST: login }, { POST: requestCode }] = await Promise.all([
    import('../app/api/auth/login/route'),
    import('../app/api/auth/admin-email/route'),
  ])
  async function signIn(email: string, pin: string) {
    const codeResponse = await requestCode(post('http://localhost/vine-app/api/auth/admin-email', { email }))
    assert.equal(codeResponse.status, 200, `${email} should be allowed to request a code`)
    const { devCode } = await codeResponse.json()
    return login(post('http://localhost/vine-app/api/auth/login', { pin, role: 'admin', email, emailCode: devCode }))
  }

  // The first admin bootstraps freely, so the allowlist only matters after that.
  assert.equal((await signIn('first.admin@example.com', '4321')).status, 200)
  assert.equal((await signIn('approved.two@example.com', '8765')).status, 200)

  const stranger = await requestCode(post('http://localhost/vine-app/api/auth/admin-email', {
    email: 'stranger@example.com',
  }))
  assert.equal(stranger.status, 403)
})

test('without ADMIN_EMAILS, seeding adds nobody', async () => {
  const [{ seedDefaultAdminAllowlist }, { default: getDb }] = await Promise.all([
    import('../lib/admin-allowlist'),
    import('../lib/db'),
  ])
  const db = await getDb()
  await db.execute({ sql: 'DELETE FROM admin_email_allowlist', args: [] })
  delete process.env.ADMIN_EMAILS

  await seedDefaultAdminAllowlist(db)
  assert.deepEqual(await allowlist(), [])
})
