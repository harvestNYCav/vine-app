import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentId } = await req.json()
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
  }

  const db = await getDb()
  const today = todayString()

  const result = await db.execute({
    sql: 'UPDATE sessions SET homework_assigned = 1 WHERE student_id = ? AND date = ?',
    args: [studentId, today],
  })
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'No session for today' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
