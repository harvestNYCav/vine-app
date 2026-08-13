import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { setStudentCheckIn } from '@/lib/check-ins'

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
  // Same write path as the check-in page so the admin board always knows who
  // marked a student, whichever screen the tutor used.
  await setStudentCheckIn(db, { date: sessionDate, studentId, present, recordedBy: session.userId })

  return NextResponse.json({ ok: true })
}
