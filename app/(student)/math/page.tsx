import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import MathClient from './MathClient'

export default async function MathPage() {
  const session = await getSession()
  const db = getDb()

  const row = db.prepare('SELECT * FROM math_progress WHERE user_id = ?').get(session!.userId) as {
    skill_mastery: string
    current_skill: string | null
    diagnostic_done: number
    total_problems: number
    total_correct: number
    mistake_profile: string
    skill_attempt_counts: string
  } | undefined

  const initialProgress = row ? {
    skill_mastery: JSON.parse(row.skill_mastery),
    current_skill: row.current_skill,
    diagnostic_done: row.diagnostic_done === 1,
    total_problems: row.total_problems,
    total_correct: row.total_correct,
    mistake_profile: JSON.parse(row.mistake_profile),
    skill_attempt_counts: JSON.parse(row.skill_attempt_counts),
  } : {
    skill_mastery: {},
    current_skill: null,
    diagnostic_done: false,
    total_problems: 0,
    total_correct: 0,
    mistake_profile: { carry_error: 0, borrow_error: 0, arithmetic_fact_error: 0, sign_error: 0 },
    skill_attempt_counts: {},
  }

  const initialHistory = db.prepare(
    'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30'
  ).all(session!.userId) as Array<{
    id: string
    session_type: string
    started_at: number
    ended_at: number
    total_problems: number
    correct: number
    accuracy: number
    current_skill: string
  }>

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <MathClient initialProgress={initialProgress} initialHistory={initialHistory} />
    </div>
  )
}
