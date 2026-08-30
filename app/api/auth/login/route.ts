import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import getDb from '@/lib/db'
import { createSession, COOKIE_NAME } from '@/lib/auth'
import { getStudentTracks } from '@/lib/tracks'
import { isValidEmail, normalizeEmail } from '@/lib/email-verification'
import { loginCanCreateMissingAccount, normalizeStudentName } from '@/lib/student-accounts'
import type { Role } from '@/types'

const ROLES = new Set<Role>(['student', 'tutor', 'admin', 'parent'])

export async function POST(req: NextRequest) {
  let phase = 'reading the request'
  try {
    const { name, pin, role, email, emailCode } = await req.json()

    // Admins sign in with their verified email, so they never supply a name.
    const namelessRole = role === 'admin'
    if ((!namelessRole && !name) || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin) || !ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid request', code: 'invalid_request' }, { status: 400 })
    }

    phase = 'opening the database'
    const db = await getDb()
    const normalizedName = namelessRole
      ? ''
      : role === 'student' || role === 'parent' ? normalizeStudentName(name) : String(name).trim()
    const normalizedEmail = normalizeEmail(email)

    if (role === 'admin') {
      if (!isValidEmail(normalizedEmail) || typeof emailCode !== 'string' || !/^\d{6}$/.test(emailCode)) {
        return NextResponse.json({ error: 'Email verification required' }, { status: 400 })
      }

      phase = 'checking the email verification code'
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

    phase = 'loading the account'
    const userResult = namelessRole
      ? await db.execute({
          sql: "SELECT * FROM users WHERE role = 'admin' AND LOWER(email) = LOWER(?)",
          args: [normalizedEmail],
        })
      : await db.execute({
          sql: 'SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND role = ?',
          args: [normalizedName, role],
        })
    const rawUser = userResult.rows[0]

    let user: { id: string; name: string; email: string | null; pin_hash: string; role: Role; created_at: number; last_active: number } | undefined
    let createdAdmin = false

    if (!rawUser) {
      if (!loginCanCreateMissingAccount(role)) {
        return NextResponse.json({
          error: role === 'parent'
            ? 'Parent account not found. Ask an admin to create it before signing in.'
            : 'Student account not found. Ask an admin to create it before signing in.',
          code: role === 'parent' ? 'parent_not_found' : 'student_not_found',
        }, { status: 404 })
      }

      if (role === 'admin') {
        const adminResult = await db.execute({
          sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
          args: [],
        })
        const adminCount = Number(adminResult.rows[0]?.count ?? 0)
        if (adminCount > 0) {
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
      // users.name is required, and an admin has no separate one to give, so the
      // verified email is what the app calls them.
      const displayName = namelessRole ? normalizedEmail : normalizedName
      phase = 'creating the account'
      await db.execute({
        sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, displayName, role === 'admin' ? normalizedEmail : null, pinHash, role, now, now],
      })
      user = { id, name: displayName, email: role === 'admin' ? normalizedEmail : null, pin_hash: pinHash, role, created_at: now, last_active: now }
      createdAdmin = role === 'admin'
    } else {
      user = {
        id: rawUser.id as string,
        name: rawUser.name as string,
        email: role === 'admin' ? normalizedEmail : (rawUser.email as string | null),
        pin_hash: rawUser.pin_hash as string,
        role: rawUser.role as Role,
        created_at: rawUser.created_at as number,
        last_active: rawUser.last_active as number,
      }
      const valid = await bcrypt.compare(pin, user.pin_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Wrong PIN', code: 'wrong_pin' }, { status: 401 })
      }
      phase = 'updating the account'
      await db.execute({ sql: 'UPDATE users SET last_active = ? WHERE id = ?', args: [Date.now(), user.id] })
    }

    if (role === 'admin') {
      phase = 'clearing admin verification records'
      await Promise.all([
        db.execute({ sql: 'DELETE FROM admin_email_verifications WHERE email = ?', args: [normalizedEmail] }),
        createdAdmin
          ? db.execute({ sql: 'DELETE FROM admin_email_allowlist WHERE email = ?', args: [normalizedEmail] })
          : Promise.resolve(),
      ])
    }

    phase = 'creating the session'
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
  } catch (error) {
    console.error('Login failed:', { phase, error })
    return NextResponse.json({
      error: `Could not log in while ${phase}. Please try again or contact an admin.`,
      code: 'server_error',
    }, { status: 500 })
  }
}
