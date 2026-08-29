import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import getDb from '@/lib/db'
import {
  createVerificationCode,
  EmailDeliveryError,
  isEmailConfigError,
  isEmailDeliveryError,
  isValidEmail,
  normalizeEmail,
  sendAdminVerificationEmail,
} from '@/lib/email-verification'

function summarizeEmailDeliveryError(error: EmailDeliveryError): string {
  const details = error.details
  const resendMessage =
    details && typeof details === 'object' && 'message' in details
      ? String((details as { message?: unknown }).message ?? '')
      : details && typeof details === 'object' && 'error' in details
        ? String((details as { error?: unknown }).error ?? '')
      : typeof details === 'string'
        ? details
        : ''

  if (error.status === 0) {
    return `${resendMessage || error.message} Check that the Vercel function can reach api.resend.com.`
  }

  if (/domain|sender|from/i.test(resendMessage)) {
    return `${resendMessage} Check that ADMIN_EMAIL_FROM uses a verified Resend sender.`
  }

  if (/api key|authorization|permission/i.test(resendMessage)) {
    return `${resendMessage} Check the RESEND_API_KEY value in Vercel.`
  }

  return resendMessage || 'Resend rejected the verification email. Check the Vercel function logs for details.'
}

export async function POST(req: NextRequest) {
  let phase = 'reading the request'
  try {
    const { email } = await req.json()
    const normalizedEmail = normalizeEmail(email)

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
    }

    phase = 'opening the database'
    const db = await getDb()
    phase = 'checking the admin account'
    // The email is the admin's identity, so an existing account is found by it
    // and anything else is a signup that has to be approved first.
    const adminResult = await db.execute({
      sql: "SELECT id FROM users WHERE role = 'admin' AND LOWER(email) = LOWER(?)",
      args: [normalizedEmail],
    })

    if (!adminResult.rows[0]) {
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
    }

    const code = createVerificationCode()
    const codeHash = await bcrypt.hash(code, 10)
    const now = Date.now()

    phase = 'saving the verification code'
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

    phase = 'sending the verification email'
    const delivery = await sendAdminVerificationEmail(normalizedEmail, code)
    return NextResponse.json({ ok: true, ...delivery })
  } catch (error) {
    if (isEmailConfigError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (isEmailDeliveryError(error)) {
      console.error('Admin email delivery failed:', {
        phase,
        status: error.status,
        details: error.details,
      })
      return NextResponse.json({
        error: summarizeEmailDeliveryError(error),
      }, { status: 502 })
    }

    console.error('Admin email verification failed:', { phase, error })
    return NextResponse.json({
      error: `Could not send verification email while ${phase}. Please try again or contact an admin.`,
    }, { status: 500 })
  }
}
