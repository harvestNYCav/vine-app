import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

// getDb caches one client per process, so the whole file shares one database and
// the tests below run in order: sign up, wait, get approved, then a declined one.
const directory = mkdtempSync(join(tmpdir(), 'vine-tutor-approvals-'))
process.env.TURSO_DATABASE_URL = `file:${join(directory, 'tutors.db')}`

async function setup() {
  const [{ POST }, { default: getDb }, approvals] = await Promise.all([
    import('../app/api/auth/login/route'),
    import('../lib/db'),
    import('../lib/tutor-approvals'),
  ])
  const signIn = (name: string, pin: string) => POST(new NextRequest('http://localhost/vine-app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin, role: 'tutor' }),
  }))
  return { signIn, db: await getDb(), ...approvals }
}

async function tutorCount(db: Awaited<ReturnType<typeof setup>>['db']) {
  const result = await db.execute({ sql: "SELECT COUNT(*) AS count FROM users WHERE role = 'tutor'", args: [] })
  return Number(result.rows[0].count)
}

after(() => {
  delete process.env.TURSO_DATABASE_URL
  rmSync(directory, { recursive: true, force: true })
})

test('a new tutor\'s first sign-in waits for approval instead of creating an account', async () => {
  const { signIn, db, listTutorSignupRequests } = await setup()

  const response = await signIn('Sam Rivera', '2468')
  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'tutor_pending_approval')
  assert.equal(response.headers.get('set-cookie'), null)

  assert.equal(await tutorCount(db), 0)
  const requests = await listTutorSignupRequests(db)
  assert.deepEqual(requests.map(request => request.name), ['Sam Rivera'])
})

test('signing in again keeps waiting, and a different PIN cannot take over the request', async () => {
  const { signIn, db, listTutorSignupRequests } = await setup()

  const again = await signIn('sam rivera', '2468')
  assert.equal(again.status, 403)
  assert.equal((await again.json()).code, 'tutor_pending_approval')

  const stranger = await signIn('Sam Rivera', '1111')
  assert.equal(stranger.status, 401)
  assert.equal((await stranger.json()).code, 'wrong_pin')

  assert.equal((await listTutorSignupRequests(db)).length, 1)
  assert.equal(await tutorCount(db), 0)
})

test('once an admin approves, the tutor signs in with the PIN they chose', async () => {
  const { signIn, db, listTutorSignupRequests, approveTutorSignup } = await setup()
  const [request] = await listTutorSignupRequests(db)

  const approved = await approveTutorSignup(db, request.id)
  assert.equal(approved.ok, true)
  assert.equal(approved.ok === true && approved.tutor.name, 'Sam Rivera')
  assert.deepEqual(await listTutorSignupRequests(db), [])

  const response = await signIn('Sam Rivera', '2468')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).role, 'tutor')
  assert.match(String(response.headers.get('set-cookie')), /vine_session=/)

  const twice = await approveTutorSignup(db, request.id)
  assert.equal(twice.ok === false && twice.reason, 'not_found')
  assert.equal(await tutorCount(db), 1)
})

test('a declined tutor has no account and can sign up again with a new PIN', async () => {
  const { signIn, db, listTutorSignupRequests, declineTutorSignup } = await setup()

  assert.equal((await signIn('Pat Lee', '1357')).status, 403)
  const [request] = await listTutorSignupRequests(db)
  assert.equal(await declineTutorSignup(db, request.id), true)
  assert.equal(await declineTutorSignup(db, request.id), false)
  assert.equal(await tutorCount(db), 1)

  const retry = await signIn('Pat Lee', '9753')
  assert.equal(retry.status, 403)
  assert.equal((await retry.json()).code, 'tutor_pending_approval')
  const [fresh] = await listTutorSignupRequests(db)
  assert.notEqual(fresh.id, request.id)
})

test('approval refuses to create a second tutor with a name already in use', async () => {
  const { db, listTutorSignupRequests, approveTutorSignup } = await setup()
  await db.execute({
    sql: "INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES ('seeded', 'PAT LEE', NULL, 'x', 'tutor', 0, 0)",
    args: [],
  })
  const [request] = await listTutorSignupRequests(db)

  const result = await approveTutorSignup(db, request.id)
  assert.equal(result.ok === false && result.reason, 'conflict')
  assert.equal((await listTutorSignupRequests(db)).length, 1)
  db.close()
})
