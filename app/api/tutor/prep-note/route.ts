import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateSaturdayPrepNote } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentName, modulesCompleted, strugglingWords, teachSessions, daysSinceLastVisit } = await req.json()

  const note = await generateSaturdayPrepNote(
    studentName,
    modulesCompleted,
    strugglingWords,
    teachSessions,
    daysSinceLastVisit
  )

  return NextResponse.json({ note })
}
