import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import PracticeClient from './PracticeClient'
import MathClient from '../math/MathClient'
import ModeToggle from '../ModeToggle'
import Link from 'next/link'

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; skill?: string }>
}) {
  const { mode, skill } = await searchParams
  const isMath = mode === 'math'

  const session = await getSession()
  const db = getDb()

  if (isMath) {
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
      id: string; session_type: string; started_at: number; ended_at: number
      total_problems: number; correct: number; accuracy: number; current_skill: string
    }>

    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">Practice</h1>
            <p className="text-gray-500 text-sm">Math arithmetic</p>
          </div>
          <ModeToggle currentMode="math" />
        </div>
        <MathClient
          initialProgress={initialProgress}
          initialHistory={initialHistory}
          initialSkillFocus={skill || null}
        />
      </div>
    )
  }

  // ESL mode
  const now = Date.now()
  const dueWords = db.prepare(`
    SELECT * FROM vocab_progress WHERE user_id = ? AND next_review_at <= ? ORDER BY next_review_at ASC LIMIT 10
  `).all(session!.userId, now) as Array<{ word_id: string; module_slug: string }>

  const cards = dueWords.flatMap(row => {
    const mod = ALL_MODULES.find(m => m.slug === row.module_slug)
    const vocab = mod?.vocab.find(v => `${row.module_slug}:${v.id}` === row.word_id)
    if (!vocab || !mod) return []
    return [{ wordId: row.word_id, moduleSlug: row.module_slug, ...vocab }]
  })

  if (cards.length === 0) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">Practice</h1>
            <p className="text-gray-500 text-sm">ESL · Spaced repetition</p>
          </div>
          <ModeToggle currentMode="esl" />
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">All caught up!</h2>
          <p className="text-gray-500 mb-1">No words to review right now.</p>
          <p className="text-gray-400 text-sm mb-8">¡Al día! No hay palabras para repasar ahora.</p>
          <Link href="/modules">
            <button className="bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors">
              Go learn something new →
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Practice</h1>
          <p className="text-gray-500 text-sm">Repaso · {cards.length} words due / palabras</p>
        </div>
        <ModeToggle currentMode="esl" />
      </div>
      <PracticeClient cards={cards} />
    </div>
  )
}
