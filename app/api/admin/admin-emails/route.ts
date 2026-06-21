import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isValidEmail, normalizeEmail } from '@/lib/email-verification'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await req.json()
  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const db = await getDb()
  const existingAdminResult = await db.execute({
    sql: "SELECT id FROM users WHERE role = 'admin' AND LOWER(email) = LOWER(?)",
    args: [normalizedEmail],
  })
  if (existingAdminResult.rows[0]) {
    return NextResponse.json({ error: 'That email already belongs to an admin account.' }, { status: 409 })
  }

  const now = Date.now()
  await db.execute({
    sql: `
      INSERT INTO admin_email_allowlist (email, created_by, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        created_by = excluded.created_by,
        created_at = excluded.created_at
    `,
    args: [normalizedEmail, session.userId, now],
  })

  return NextResponse.json({ ok: true, email: normalizedEmail, createdAt: now })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await req.json()
  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const db = await getDb()
  await db.execute({
    sql: 'DELETE FROM admin_email_allowlist WHERE email = ?',
    args: [normalizedEmail],
  })

  return NextResponse.json({ ok: true })
}
