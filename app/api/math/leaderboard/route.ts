import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const VALID_TYPES = ['practice_5', 'practice_10', 'flat_10', 'flat_25']
  const type = req.nextUrl.searchParams.get('type') || 'practice_5'
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const isTimed = type === 'practice_5' || type === 'practice_10'
  const db = getDb()

  if (isTimed) {
    // Rank by most problems correct
    const rows = db.prepare(`
      SELECT ms.user_id, u.name, ms.correct, ms.accuracy, ms.total_problems, ms.started_at
      FROM math_sessions ms
      JOIN users u ON u.id = ms.user_id
      WHERE ms.session_type = ?
      ORDER BY ms.correct DESC, ms.accuracy DESC
      LIMIT 20
    `).all(type) as Array<{
      user_id: string; name: string; correct: number; accuracy: number; total_problems: number; started_at: number
    }>

    return NextResponse.json({ type, isTimed, currentUserId: session.userId, rows })
  } else {
    // Rank by fastest completion time
    const rows = db.prepare(`
      SELECT ms.user_id, u.name, ms.correct, ms.total_problems, ms.accuracy,
             (ms.ended_at - ms.started_at) as duration_ms
      FROM math_sessions ms
      JOIN users u ON u.id = ms.user_id
      WHERE ms.session_type = ? AND ms.ended_at > ms.started_at AND ms.total_problems = ms.correct
      ORDER BY duration_ms ASC
      LIMIT 20
    `).all(type) as Array<{
      user_id: string; name: string; correct: number; total_problems: number; accuracy: number; duration_ms: number
    }>

    // Also include sessions that weren't perfect, ranked after the perfect ones
    const imperfect = db.prepare(`
      SELECT ms.user_id, u.name, ms.correct, ms.total_problems, ms.accuracy,
             (ms.ended_at - ms.started_at) as duration_ms
      FROM math_sessions ms
      JOIN users u ON u.id = ms.user_id
      WHERE ms.session_type = ? AND ms.ended_at > ms.started_at AND ms.total_problems > ms.correct
      ORDER BY ms.correct DESC, duration_ms ASC
      LIMIT 20
    `).all(type) as typeof rows

    return NextResponse.json({ type, isTimed, currentUserId: session.userId, rows: [...rows, ...imperfect].slice(0, 20) })
  }
}
