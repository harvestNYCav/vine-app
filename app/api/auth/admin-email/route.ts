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
    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
      args: [],
    })
    const adminCount = Number(countResult.rows[0]?.count ?? 0)
    if (adminCount > 0) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
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

  try {
    const delivery = await sendAdminVerificationEmail(normalizedEmail, code)
    return NextResponse.json({ ok: true, ...delivery })
  } catch {
    return NextResponse.json({ error: 'Could not send verification email' }, { status: 500 })
  }
}
