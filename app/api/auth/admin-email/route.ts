import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import getDb from '@/lib/db'
import {
  createVerificationCode,
  isValidEmail,
  normalizeEmail,
  sendAdminVerificationEmail,
} from '@/lib/email-verification'

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json()
    const normalizedName = typeof name === 'string' ? name.trim() : ''
    const normalizedEmail = normalizeEmail(email)

    if (normalizedName.length < 2 || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid name and email' }, { status: 400 })
    }

    const db = await getDb()
    const adminResult = await db.execute({
      sql: 'SELECT id, email FROM users WHERE LOWER(name) = LOWER(?) AND role = ?',
      args: [normalizedName, 'admin'],
    })
    const admin = adminResult.rows[0]

    if (!admin) {
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

      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
        args: [],
      })
      const adminCount = Number(countResult.rows[0]?.count ?? 0)
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
    } else if (admin.email && String(admin.email).toLowerCase() !== normalizedEmail) {
      return NextResponse.json({ error: 'Email does not match this admin account' }, { status: 401 })
    }

    const code = createVerificationCode()
    const codeHash = await bcrypt.hash(code, 10)
    const now = Date.now()

    await db.execute({
      sql: `
        INSERT INTO admin_email_verifications (email, code_hash, expires_at, attempts, created_at)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(email) DO UPDATE SET
          code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          attempts = 0,
          created_at = excluded.created_at
      `,
      args: [normalizedEmail, codeHash, now + 10 * 60 * 1000, now],
    })

    const delivery = await sendAdminVerificationEmail(normalizedEmail, code)
    return NextResponse.json({ ok: true, ...delivery })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Email delivery is not configured') {
      return NextResponse.json({
        error: 'Admin email delivery is not configured. Set RESEND_API_KEY in production to send verification codes.',
      }, { status: 500 })
    }
    console.error('Admin email verification failed:', error)
    return NextResponse.json({ error: 'Could not send verification email. Please try again or contact an admin.' }, { status: 500 })
  }
}
