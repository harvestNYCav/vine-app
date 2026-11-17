import type { Client } from '@libsql/client'

// Math practice leaderboards rank students, not runs: each student appears once, with their best
// run of that type. (Ranking runs let one student fill several places with repeat attempts.)

export const LEADERBOARD_TYPES = ['practice_5', 'practice_10', 'flat_10', 'flat_25'] as const
export type LeaderboardType = (typeof LEADERBOARD_TYPES)[number]

// Timed runs (5 or 10 minutes) rank by problems solved. Fixed-length runs (10 or 25 questions)
// rank perfect runs first, then by problems solved, then by speed.
export const isTimedLeaderboard = (type: LeaderboardType) => type === 'practice_5' || type === 'practice_10'

export function isLeaderboardType(value: string): value is LeaderboardType {
  return (LEADERBOARD_TYPES as readonly string[]).includes(value)
}

export interface LeaderboardRow {
  user_id: string
  name: string
  correct: number
  accuracy: number
  total_problems: number
  duration_ms?: number
}

export async function getMathLeaderboard(
  db: Client,
  type: LeaderboardType,
  options: { limit: number; tutorId?: string },
): Promise<LeaderboardRow[]> {
  const timed = isTimedLeaderboard(type)
  const order = timed
    ? 'ms.correct DESC, ms.accuracy DESC, ms.started_at ASC'
    : '(ms.correct = ms.total_problems) DESC, ms.correct DESC, (ms.ended_at - ms.started_at) ASC, ms.started_at ASC'
  const outerOrder = timed
    ? 'correct DESC, accuracy DESC, started_at ASC'
    : '(correct = total_problems) DESC, correct DESC, duration_ms ASC, started_at ASC'
  const tutorScope = options.tutorId
    ? 'AND EXISTS (SELECT 1 FROM student_tutors st WHERE st.student_id = ms.user_id AND st.tutor_id = ?)'
    : ''
  const result = await db.execute({
    sql: `SELECT user_id, name, correct, accuracy, total_problems, duration_ms FROM (
            SELECT ms.user_id, u.name, ms.correct, ms.accuracy, ms.total_problems, ms.started_at,
                   (ms.ended_at - ms.started_at) AS duration_ms,
                   ROW_NUMBER() OVER (PARTITION BY ms.user_id ORDER BY ${order}) AS student_rank
            FROM math_sessions ms JOIN users u ON u.id = ms.user_id
            WHERE ms.session_type = ? ${timed ? '' : 'AND ms.ended_at > ms.started_at'} ${tutorScope}
          )
          WHERE student_rank = 1
          ORDER BY ${outerOrder}
          LIMIT ?`,
    args: options.tutorId ? [type, options.tutorId, options.limit] : [type, options.limit],
  })
  return result.rows.map(row => ({
    user_id: String(row.user_id),
    name: String(row.name),
    correct: Number(row.correct),
    accuracy: Number(row.accuracy),
    total_problems: Number(row.total_problems),
    ...(timed ? {} : { duration_ms: Number(row.duration_ms) }),
  }))
}
