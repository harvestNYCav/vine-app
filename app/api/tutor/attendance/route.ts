import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const [sessionsResult, studentsResult, attendanceResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM sessions ORDER BY date ASC', args: [] }),
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'student' ORDER BY name", args: [] }),
    db.execute({ sql: 'SELECT * FROM attendance', args: [] }),
  ])

  return NextResponse.json({
    sessions: sessionsResult.rows,
    students: studentsResult.rows,
    attendance: attendanceResult.rows,
  })
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

  const db = await getDb()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO attendance (session_date, student_id, present) VALUES (?, ?, ?)',
    args: [sessionDate, studentId, present ? 1 : 0],
  })

  return NextResponse.json({ ok: true })
}
