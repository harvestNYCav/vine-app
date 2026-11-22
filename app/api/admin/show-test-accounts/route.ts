import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { SHOW_TEST_ACCOUNTS_COOKIE } from '@/lib/account-visibility'

// Remembers the admin's "Show test accounts" choice in a cookie the admin pages read.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const show = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? (rawBody as Record<string, unknown>).show
    : undefined
  if (typeof show !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true, show })
  response.cookies.set(SHOW_TEST_ACCOUNTS_COOKIE, show ? '1' : '0', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
