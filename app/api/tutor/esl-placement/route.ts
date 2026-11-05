import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import { InvalidPlacementError, parsePlacementInput, saveEslPlacement } from '@/lib/esl-placement'

// Saves a tutor-led ESL placement test. The browser sends only which items the student passed;
// the score and suggested level are worked out here.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let input
  try {
    input = parsePlacementInput(await req.json())
  } catch (error) {
    if (error instanceof InvalidPlacementError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  const db = await getDb()
  const saved = await saveEslPlacement(db, session.userId, todayString(), input)
  if (!saved) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, ...saved })
}
