import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { InvalidWrapUpError, parseSessionWrapUp, saveSessionWrapUp } from '@/lib/session-metrics'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let wrapUp
  try {
    wrapUp = parseSessionWrapUp(await req.json())
  } catch (error) {
    if (error instanceof InvalidWrapUpError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  const db = await getDb()
  const saved = await saveSessionWrapUp(db, session.userId, wrapUp)
  if (!saved) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
