import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getParentChildren, parentChildCookieName } from '@/lib/parents'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const studentId = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? (rawBody as Record<string, unknown>).studentId
    : null
  if (typeof studentId !== 'string' || studentId.length === 0) {
    return NextResponse.json({ error: 'Choose a student to view.' }, { status: 400 })
  }

  const db = await getDb()
  const children = await getParentChildren(db, session.userId)
  if (!children.some(child => child.id === studentId)) {
    return NextResponse.json({ error: 'That student is not linked to this parent account.' }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true, studentId })
  response.cookies.set(parentChildCookieName(session.userId), studentId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
