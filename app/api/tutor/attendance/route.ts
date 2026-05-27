import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY date ASC').all() as Array<{
    id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number; created_at: number
  }>
  const students = db.prepare("SELECT id, name FROM users WHERE role = 'student' ORDER BY name").all() as Array<{ id: string; name: string }>
  const attendance = db.prepare('SELECT * FROM attendance').all() as Array<{ session_date: string; student_id: string; present: number }>

  return NextResponse.json({ sessions, students, attendance })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionDate, studentId, present } = await req.json()
  if (!sessionDate || !studentId || typeof present !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO attendance (session_date, student_id, present) VALUES (?, ?, ?)').run(
    sessionDate, studentId, present ? 1 : 0
  )

  return NextResponse.json({ ok: true })
}
