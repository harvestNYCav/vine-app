import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

test('student login rejects a missing account and accepts an admin-provisioned account', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-student-login-'))
  process.env.TURSO_DATABASE_URL = `file:${join(directory, 'login.db')}`

  try {
    const [{ POST }, { default: getDb }, { createStudentAccount }] = await Promise.all([
      import('../app/api/auth/login/route'),
      import('../lib/db'),
      import('../lib/student-accounts'),
    ])

    const missingResponse = await POST(new NextRequest('http://localhost/vine-app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Not Provisioned', pin: '1234', role: 'student' }),
    }))
    assert.equal(missingResponse.status, 404)
    assert.match((await missingResponse.json()).error, /ask an admin to create it/i)

    const db = await getDb()
    const missingCount = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM users WHERE role = 'student'",
      args: [],
    })
    assert.equal(Number(missingCount.rows[0]?.count), 0)

    const created = await createStudentAccount(db, { name: '  Maria   Lopez ', pin: '0042' })
    assert.equal(created.ok, true)

    const loginResponse = await POST(new NextRequest('http://localhost/vine-app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Maria   Lopez  ', pin: '0042', role: 'student' }),
    }))
    assert.equal(loginResponse.status, 200)
    assert.equal((await loginResponse.json()).needsTrackSelection, true)

    db.close()
  } finally {
    delete process.env.TURSO_DATABASE_URL
    rmSync(directory, { recursive: true, force: true })
  }
})
