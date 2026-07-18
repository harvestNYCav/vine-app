import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import MathClient from './MathClient'
import { getStudentTracks } from '@/lib/tracks'
import { getStudentSettings } from '@/lib/student-settings'
import { notFound } from 'next/navigation'

export default async function MathPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const session = await getSession()
  const db = await getDb()
  const [tracks, settings] = await Promise.all([
    getStudentTracks(db, session!.userId),
    getStudentSettings(db, session!.userId),
  ])
  if (!tracks.includes('math')) notFound()
  const isSpanish = settings.mathSpanishEnabled && lang === 'es'

  const [rowResult, historyResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM math_progress WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30', args: [session!.userId] }),
  ])

  const row = rowResult.rows[0]

  const initialProgress = row ? {
    skill_mastery: JSON.parse(row.skill_mastery as string),
    current_skill: row.current_skill as string | null,
    diagnostic_done: Number(row.diagnostic_done) === 1,
    total_problems: Number(row.total_problems),
    total_correct: Number(row.total_correct),
    mistake_profile: JSON.parse(row.mistake_profile as string),
    skill_attempt_counts: JSON.parse(row.skill_attempt_counts as string),
  } : {
    skill_mastery: {},
    current_skill: null,
    diagnostic_done: false,
    total_problems: 0,
    total_correct: 0,
    mistake_profile: { carry_error: 0, borrow_error: 0, arithmetic_fact_error: 0, sign_error: 0 },
    skill_attempt_counts: {},
  }

  const initialHistory = historyResult.rows.map(row => ({
    id: String(row.id),
    session_type: String(row.session_type),
    started_at: Number(row.started_at),
    ended_at: Number(row.ended_at),
    total_problems: Number(row.total_problems),
    correct: Number(row.correct),
    accuracy: Number(row.accuracy),
    current_skill: String(row.current_skill),
  }))

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <MathClient
        initialProgress={initialProgress}
        initialHistory={initialHistory}
        isSpanish={isSpanish}
        userId={session!.userId}
      />
    </div>
  )
}
