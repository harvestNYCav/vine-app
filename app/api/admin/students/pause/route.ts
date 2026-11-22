import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { pauseStudent, resumeStudent, validatePauseUntil } from '@/lib/account-visibility'
import { todayString } from '@/lib/scheduling'

// Pauses a student who is away for a while (optionally until a back-on date), or resumes them.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { studentId, paused, until: rawUntil } = (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? rawBody
    : {}) as Record<string, unknown>
  if (typeof studentId !== 'string' || studentId.length === 0 || typeof paused !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await getDb()
  const today = todayString()
  let found: boolean
  if (paused) {
    const until = validatePauseUntil(rawUntil, today)
    if (!until.ok) return NextResponse.json({ error: until.error }, { status: 400 })
    found = await pauseStudent(db, studentId, { today, until: until.until })
  } else {
    found = await resumeStudent(db, studentId)
  }
  if (!found) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
