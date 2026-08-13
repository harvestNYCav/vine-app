import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { isCheckInDate, setStudentCheckIn, setTutorCheckIn } from '@/lib/check-ins'
import { todayString } from '@/lib/scheduling'

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
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { subject, date: rawDate, studentId, present } = rawBody as Record<string, unknown>
  const date = isCheckInDate(rawDate) ? rawDate : todayString()
  if (typeof present !== 'boolean') {
    return NextResponse.json({ error: 'Check-in must be present or absent.' }, { status: 400 })
  }

  const db = await getDb()

  if (subject === 'self') {
    await setTutorCheckIn(db, { date, tutorId: session.userId, present })
    return NextResponse.json({ ok: true, date })
  }

  if (subject !== 'student' || typeof studentId !== 'string' || studentId.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const studentResult = await db.execute({
    sql: "SELECT id FROM users WHERE id = ? AND role = 'student'",
    args: [studentId],
  })
  if (!studentResult.rows[0]) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  await setStudentCheckIn(db, { date, studentId, present, recordedBy: session.userId })
  return NextResponse.json({ ok: true, date })
}
