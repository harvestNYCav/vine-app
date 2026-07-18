import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import { markSessionHomeworkAssigned } from '@/lib/tutor-lesson-assignment'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await req.json()
  if (typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const db = await getDb()
  const today = todayString()

  const assigned = await markSessionHomeworkAssigned(db, sessionId, today)
  if (!assigned) {
    return NextResponse.json({ error: 'No session for today' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
