import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

// getDb caches one client per process, so the whole file shares one database and
// the tests below run in order: bootstrap, then sign in again, then a stranger.
const directory = mkdtempSync(join(tmpdir(), 'vine-admin-login-'))
process.env.TURSO_DATABASE_URL = `file:${join(directory, 'admin.db')}`

const ADMIN_EMAIL = 'first.admin@example.com'

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function routes() {
  const [{ POST: login }, { POST: requestCode }, { default: getDb }] = await Promise.all([
    import('../app/api/auth/login/route'),
    import('../app/api/auth/admin-email/route'),
    import('../lib/db'),
  ])
  return { login, requestCode, db: await getDb() }
}

async function sendCode(
  requestCode: (req: NextRequest) => Promise<Response>,
  email: string,
): Promise<string> {
  const response = await requestCode(post('http://localhost/vine-app/api/auth/admin-email', { email }))
  assert.equal(response.status, 200)
  const { devCode } = await response.json()
  assert.match(String(devCode), /^\d{6}$/)
  return String(devCode)
}

after(() => {
  delete process.env.TURSO_DATABASE_URL
  rmSync(directory, { recursive: true, force: true })
})

test('the first admin signs in with a verified email and PIN, never a name', async () => {
  const { login, requestCode, db } = await routes()

  const created = await login(post('http://localhost/vine-app/api/auth/login', {
    pin: '4321',
    role: 'admin',
    email: ADMIN_EMAIL,
    emailCode: await sendCode(requestCode, ADMIN_EMAIL),
  }))
  assert.equal(created.status, 200)
  assert.equal((await created.json()).role, 'admin')

  // The account is keyed on the email, and that is what the app calls them.
  const stored = await db.execute({ sql: "SELECT name, email FROM users WHERE role = 'admin'", args: [] })
  assert.equal(stored.rows.length, 1)
  assert.equal(String(stored.rows[0].email), ADMIN_EMAIL)
  assert.equal(String(stored.rows[0].name), ADMIN_EMAIL)
})

test('signing in again finds the same account instead of creating a second one', async () => {
  const { login, requestCode, db } = await routes()

  const again = await login(post('http://localhost/vine-app/api/auth/login', {
    pin: '4321',
    role: 'admin',
    email: ADMIN_EMAIL,
    emailCode: await sendCode(requestCode, ADMIN_EMAIL),
  }))
  assert.equal(again.status, 200)

  const count = await db.execute({ sql: "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", args: [] })
  assert.equal(Number(count.rows[0].count), 1)
})

test('a wrong PIN is still refused once the email is verified', async () => {
  const { login, requestCode } = await routes()

  const wrongPin = await login(post('http://localhost/vine-app/api/auth/login', {
    pin: '0000',
    role: 'admin',
    email: ADMIN_EMAIL,
    emailCode: await sendCode(requestCode, ADMIN_EMAIL),
  }))
  assert.equal(wrongPin.status, 401)
  assert.equal((await wrongPin.json()).code, 'wrong_pin')
})

test('a second admin still has to be approved by email before signing up', async () => {
  const { requestCode, db } = await routes()
  await db.execute({ sql: 'DELETE FROM admin_email_allowlist', args: [] })

  const blocked = await requestCode(post('http://localhost/vine-app/api/auth/admin-email', {
    email: 'stranger@example.com',
  }))
  assert.equal(blocked.status, 403)
  assert.match((await blocked.json()).error, /not approved/i)
})

test('an approved second admin can then sign up, still without a name', async () => {
  const { login, requestCode, db } = await routes()
  const second = 'second.admin@example.com'
  await db.execute({
    sql: 'INSERT INTO admin_email_allowlist (email, created_by, created_at) VALUES (?, ?, ?)',
    args: [second, 'test', Date.now()],
  })

  const created = await login(post('http://localhost/vine-app/api/auth/login', {
    pin: '8765',
    role: 'admin',
    email: second,
    emailCode: await sendCode(requestCode, second),
  }))
  assert.equal(created.status, 200)

  const admins = await db.execute({ sql: "SELECT email FROM users WHERE role = 'admin' ORDER BY email", args: [] })
  assert.deepEqual(admins.rows.map(row => String(row.email)), [ADMIN_EMAIL, second])
})
