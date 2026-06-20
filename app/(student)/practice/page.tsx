import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import PracticeClient from './PracticeClient'
import MathClient from '../math/MathClient'
import ModeToggle from '../ModeToggle'
import { firstTrackPath, getStudentTracks } from '@/lib/tracks'
import { redirect } from 'next/navigation'
import type { Track } from '@/types'

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; skill?: string }>
}) {
  const { mode, skill } = await searchParams

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (tracks.length === 0) redirect('/tracks')

  const currentMode: Track = mode === 'math' ? 'math' : mode === 'ela' ? 'ela' : 'esl'
  if (!tracks.includes(currentMode)) redirect(firstTrackPath(tracks))

  if (currentMode === 'math') {
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-green-800">Practice</h1>
            <p className="text-gray-500 text-sm">Math arithmetic</p>
          </div>
          <ModeToggle currentMode="math" availableTracks={tracks} />
        </div>
        <MathClient
          initialProgress={initialProgress}
          initialHistory={initialHistory}
          initialSkillFocus={skill || null}
        />
      </div>
    )
  }

  // English modes
  const visibleModules = ALL_MODULES.filter(mod => mod.track === currentMode)
  const visibleModuleSlugs = new Set(visibleModules.map(mod => mod.slug))
  const now = Date.now()
  const dueResult = await db.execute({
    sql: 'SELECT * FROM vocab_progress WHERE user_id = ? AND next_review_at <= ? ORDER BY next_review_at ASC LIMIT 10',
    args: [session!.userId, now],
  })
  type DueWordRow = { word_id: string; module_slug: string }
  const dueWords = dueResult.rows as unknown as DueWordRow[]

  const cards = dueWords.flatMap(row => {
    if (!visibleModuleSlugs.has(row.module_slug)) return []
    const mod = visibleModules.find(m => m.slug === row.module_slug)
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
            <p className="text-gray-500 text-sm">{currentMode.toUpperCase()} · Spaced repetition</p>
          </div>
          <ModeToggle currentMode={currentMode} availableTracks={tracks} />
        </div>
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">All caught up!</h2>
          <p className="text-gray-500 mb-1">No words to review right now.</p>
          <p className="text-gray-400 text-sm mb-8">¡Al día! No hay palabras para repasar ahora.</p>
          <a href={currentMode === 'ela' ? '/vine-app/modules?mode=ela' : '/vine-app/modules'}>
            <button className="bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors">
              Go learn something new →
            </button>
          </a>
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
        <ModeToggle currentMode={currentMode} availableTracks={tracks} />
      </div>
      <PracticeClient cards={cards} />
    </div>
  )
}
