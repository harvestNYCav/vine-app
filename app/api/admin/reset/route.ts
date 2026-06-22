import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession, COOKIE_NAME } from '@/lib/auth'
import { deleteUserProfile, resetDatabase } from '@/lib/admin-reset'

async function requireAdmin() {
  const session = await getSession()
  return session?.role === 'admin' ? session : null
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json()
  if (typeof userId !== 'string' || userId.length === 0) {
    return NextResponse.json({ error: 'Choose a profile to delete.' }, { status: 400 })
  }

  const db = await getDb()
  const userResult = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ? AND role IN ('student', 'tutor')",
    args: [userId],
  })
  const user = userResult.rows[0]
  if (!user) {
    return NextResponse.json({ error: 'Student or tutor profile not found.' }, { status: 404 })
  }

  await deleteUserProfile(db, String(user.id), user.role as 'student' | 'tutor')
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { confirmation } = await req.json()
  if (confirmation !== 'RESET') {
    return NextResponse.json({ error: 'Type RESET to confirm the full database reset.' }, { status: 400 })
  }

  const db = await getDb()
  await resetDatabase(db)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
