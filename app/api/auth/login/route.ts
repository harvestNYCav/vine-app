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

  const db = getDb()
  const normalizedName = name.trim()

  let user = db.prepare('SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND role = ?').get(normalizedName, role) as {
    id: string; name: string; pin_hash: string; role: string; tutor_id: string | null; created_at: number; last_active: number
  } | undefined

  if (!user) {
    // Create new account
    const pinHash = await bcrypt.hash(pin, 10)
    const id = randomUUID()
    const now = Date.now()
    db.prepare('INSERT INTO users (id, name, pin_hash, role, tutor_id, created_at, last_active) VALUES (?, ?, ?, ?, NULL, ?, ?)').run(
      id, normalizedName, pinHash, role, now, now
    )
    user = { id, name: normalizedName, pin_hash: pinHash, role, tutor_id: null, created_at: now, last_active: now }
  } else {
    // Verify PIN
    const valid = await bcrypt.compare(pin, user.pin_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Wrong PIN / PIN incorrecto' }, { status: 401 })
    }
    db.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(Date.now(), user.id)
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
