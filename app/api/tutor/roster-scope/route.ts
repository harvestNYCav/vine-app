import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  isTutorRosterScope,
  tutorRosterScopeCookieName,
} from '@/lib/tutor-roster'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const scope = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? (rawBody as Record<string, unknown>).scope
    : null
  if (!isTutorRosterScope(scope)) {
    return NextResponse.json({ error: 'Roster scope must be assigned or all.' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true, scope })
  response.cookies.set(tutorRosterScopeCookieName(session.userId), scope, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
