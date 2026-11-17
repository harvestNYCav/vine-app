import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getMathLeaderboard, isLeaderboardType, isTimedLeaderboard } from '@/lib/math-leaderboard'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') || 'practice_5'
  if (!isLeaderboardType(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const db = await getDb()
  const rows = await getMathLeaderboard(db, type, { limit: 20 })
  return NextResponse.json({ type, isTimed: isTimedLeaderboard(type), currentUserId: session.userId, rows })
}
