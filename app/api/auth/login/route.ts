import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import getDb from '@/lib/db'
import { createSession, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, pin, role } = await req.json()

  if (!name || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await getDb()
  const normalizedName = name.trim()

  const userResult = await db.execute({
    sql: 'SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND role = ?',
    args: [normalizedName, role],
  })
  const rawUser = userResult.rows[0]

  let user: { id: string; name: string; pin_hash: string; role: string; tutor_id: string | null; created_at: number; last_active: number } | undefined

  if (!rawUser) {
    const pinHash = await bcrypt.hash(pin, 10)
    const id = randomUUID()
    const now = Date.now()
    await db.execute({
      sql: 'INSERT INTO users (id, name, pin_hash, role, tutor_id, created_at, last_active) VALUES (?, ?, ?, ?, NULL, ?, ?)',
      args: [id, normalizedName, pinHash, role, now, now],
    })
    user = { id, name: normalizedName, pin_hash: pinHash, role, tutor_id: null, created_at: now, last_active: now }
  } else {
    user = {
      id: rawUser.id as string,
      name: rawUser.name as string,
      pin_hash: rawUser.pin_hash as string,
      role: rawUser.role as string,
      tutor_id: rawUser.tutor_id as string | null,
      created_at: rawUser.created_at as number,
      last_active: rawUser.last_active as number,
    }
    const valid = await bcrypt.compare(pin, user.pin_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Wrong PIN / PIN incorrecto' }, { status: 401 })
    }
    await db.execute({ sql: 'UPDATE users SET last_active = ? WHERE id = ?', args: [Date.now(), user.id] })
  }

  const token = await createSession({ userId: user.id, name: user.name, role: user.role as 'student' | 'tutor' })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
