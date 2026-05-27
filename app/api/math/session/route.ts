import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { randomUUID } from 'crypto'

const VALID_SESSION_TYPES = new Set(['diagnostic', 'practice_5', 'practice_10', 'flat_10', 'flat_25', 'custom'])

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const sessions = db.prepare(
    'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30'
  ).all(session.userId)

  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!VALID_SESSION_TYPES.has(body.session_type)) {
    return NextResponse.json({ error: 'Invalid session_type' }, { status: 400 })
  }

  const totalProblems = Math.max(0, Math.floor(Number(body.total_problems) || 0))
  const correct = Math.max(0, Math.floor(Number(body.correct) || 0))
  if (correct > totalProblems) {
    return NextResponse.json({ error: 'correct cannot exceed total_problems' }, { status: 400 })
  }

  const startedAt = Math.floor(Number(body.started_at) || 0)
  const endedAt = Math.floor(Number(body.ended_at) || 0)
  if (endedAt < startedAt) {
    return NextResponse.json({ error: 'ended_at must be >= started_at' }, { status: 400 })
  }

  const accuracy = Math.min(100, Math.max(0, Math.round(totalProblems ? correct / totalProblems * 100 : 0)))

  const db = getDb()
  db.prepare(`
    INSERT OR IGNORE INTO math_sessions (id, user_id, session_type, started_at, ended_at, total_problems, correct, accuracy, current_skill)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    session.userId,      // always from auth token, never from body
    body.session_type,
    startedAt,
    endedAt,
    totalProblems,
    correct,
    accuracy,
    typeof body.current_skill === 'string' ? body.current_skill.slice(0, 64) : '',
  )

  return NextResponse.json({ ok: true })
}
