import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import getDb from '@/lib/db'
import { createSession, COOKIE_NAME } from '@/lib/auth'
import { getStudentTracks } from '@/lib/tracks'
import { isValidEmail, normalizeEmail } from '@/lib/email-verification'
import type { Role } from '@/types'

const ROLES = new Set<Role>(['student', 'tutor', 'admin'])

export async function POST(req: NextRequest) {
  const { name, pin, role, email, emailCode } = await req.json()

  if (!name || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin) || !ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await getDb()
  const normalizedName = name.trim()
  const normalizedEmail = normalizeEmail(email)

  if (role === 'admin') {
    if (!isValidEmail(normalizedEmail) || typeof emailCode !== 'string' || !/^\d{6}$/.test(emailCode)) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 400 })
    }

    const verificationResult = await db.execute({
      sql: 'SELECT code_hash, expires_at, attempts FROM admin_email_verifications WHERE email = ?',
      args: [normalizedEmail],
    })
    const verification = verificationResult.rows[0]
    if (!verification || Number(verification.expires_at) < Date.now() || Number(verification.attempts) >= 5) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 401 })
    }

    const validCode = await bcrypt.compare(emailCode, String(verification.code_hash))
    if (!validCode) {
      await db.execute({
        sql: 'UPDATE admin_email_verifications SET attempts = attempts + 1 WHERE email = ?',
        args: [normalizedEmail],
      })
      return NextResponse.json({ error: 'Wrong verification code' }, { status: 401 })
    }
  }

  const userResult = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND role = ?',
    args: [normalizedName, role],
  })
  const rawUser = userResult.rows[0]

  let user: { id: string; name: string; email: string | null; pin_hash: string; role: Role; created_at: number; last_active: number } | undefined
  let createdAdmin = false

  if (!rawUser) {
    if (role === 'admin') {
      const adminResult = await db.execute({
        sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
        args: [],
      })
      const adminCount = Number(adminResult.rows[0]?.count ?? 0)
      if (adminCount > 0) {
        const adminWithEmailResult = await db.execute({
          sql: "SELECT name FROM users WHERE role = 'admin' AND LOWER(email) = LOWER(?)",
          args: [normalizedEmail],
        })
        const adminWithEmail = adminWithEmailResult.rows[0]
        if (adminWithEmail) {
          return NextResponse.json({
            error: `This email already belongs to an admin account. Sign in with the admin name "${adminWithEmail.name}".`,
          }, { status: 409 })
        }

        const allowlistResult = await db.execute({
          sql: 'SELECT email FROM admin_email_allowlist WHERE email = ?',
          args: [normalizedEmail],
        })
        if (!allowlistResult.rows[0]) {
          return NextResponse.json({
            error: 'This email is not approved for admin signup. Ask an existing admin to approve it first.',
          }, { status: 403 })
        }
      }
    }
    const pinHash = await bcrypt.hash(pin, 10)
    const id = randomUUID()
    const now = Date.now()
    await db.execute({
      sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, normalizedName, role === 'admin' ? normalizedEmail : null, pinHash, role, now, now],
    })
    user = { id, name: normalizedName, email: role === 'admin' ? normalizedEmail : null, pin_hash: pinHash, role, created_at: now, last_active: now }
    createdAdmin = role === 'admin'
  } else {
    const userEmail = rawUser.email ? String(rawUser.email).toLowerCase() : null
    if (role === 'admin' && userEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Email does not match this admin account' }, { status: 401 })
    }
    user = {
      id: rawUser.id as string,
      name: rawUser.name as string,
      email: rawUser.email as string | null,
      pin_hash: rawUser.pin_hash as string,
      role: rawUser.role as Role,
      created_at: rawUser.created_at as number,
      last_active: rawUser.last_active as number,
    }
    const valid = await bcrypt.compare(pin, user.pin_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Wrong PIN / PIN incorrecto' }, { status: 401 })
    }
    await db.execute({ sql: 'UPDATE users SET last_active = ? WHERE id = ?', args: [Date.now(), user.id] })
  }

  if (role === 'admin') {
    await Promise.all([
      db.execute({ sql: 'DELETE FROM admin_email_verifications WHERE email = ?', args: [normalizedEmail] }),
      createdAdmin
        ? db.execute({ sql: 'DELETE FROM admin_email_allowlist WHERE email = ?', args: [normalizedEmail] })
        : Promise.resolve(),
    ])
  }

  const tracks = user.role === 'student' ? await getStudentTracks(db, user.id) : []
  const token = await createSession({ userId: user.id, name: user.name, role: user.role })

  const response = NextResponse.json({
    ok: true,
    role: user.role,
    needsTrackSelection: user.role === 'student' && tracks.length === 0,
  })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
