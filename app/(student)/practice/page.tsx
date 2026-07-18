import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import PracticeClient from './PracticeClient'
import MathClient from '../math/MathClient'
import ModeToggle from '../ModeToggle'
import LangToggle from '../LangToggle'
import { firstPracticePath, getStudentTracks } from '@/lib/tracks'
import { getStudentSettings } from '@/lib/student-settings'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Track } from '@/types'
import Link from 'next/link'
import { formatDueWordCount } from '@/lib/study'

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; skill?: string; lang?: string }>
}) {
  const { mode, skill, lang } = await searchParams

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (tracks.length === 0) redirect('/tracks')

  const requestedMode: Track | null = mode === 'math' ? 'math' : mode === 'ela' ? 'ela' : mode === 'esl' ? 'esl' : null
  if (!requestedMode || !tracks.includes(requestedMode)) {
    redirect(firstPracticePath(tracks))
  }
  const currentMode = requestedMode

  if (currentMode === 'math') {
    const [rowResult, historyResult, settings] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM math_progress WHERE user_id = ?', args: [session!.userId] }),
      db.execute({ sql: 'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30', args: [session!.userId] }),
      getStudentSettings(db, session!.userId),
    ])
    const canUseSpanish = settings.mathSpanishEnabled
    const isSpanish = canUseSpanish && lang === 'es'

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
            <h1 className="text-2xl font-bold text-green-800">{isSpanish ? 'Práctica' : 'Practice'}</h1>
            <p className="text-gray-500 text-sm">{isSpanish ? 'Aritmética' : 'Math arithmetic'}</p>
          </div>
          <div className="flex items-center gap-2">
            {canUseSpanish && (
              <Suspense>
                <LangToggle currentLang={isSpanish ? 'es' : 'en'} />
              </Suspense>
            )}
            <ModeToggle currentMode="math" availableTracks={tracks} />
          </div>
        </div>
        <MathClient
          initialProgress={initialProgress}
          initialHistory={initialHistory}
          initialSkillFocus={skill || null}
          isSpanish={isSpanish}
          userId={session!.userId}
        />
      </div>
    )
  }

  // English modes
  const englishTracks = tracks.filter((track): track is 'ela' | 'esl' => track === 'ela' || track === 'esl')
  const englishModules = ALL_MODULES.filter(mod => mod.track === 'ela' || mod.track === 'esl')
  const moduleBySlug = new Map(englishModules.map(mod => [mod.slug, mod]))
  const now = Date.now()
  const dueResult = await db.execute({
    sql: 'SELECT * FROM vocab_progress WHERE user_id = ? AND next_review_at <= ? ORDER BY next_review_at ASC',
    args: [session!.userId, now],
  })
  type DueWordRow = { word_id: string; module_slug: string }
  const dueWords = dueResult.rows as unknown as DueWordRow[]

  const allDueCards = dueWords.flatMap(row => {
    const mod = moduleBySlug.get(row.module_slug)
    const vocab = mod?.vocab.find(v => `${row.module_slug}:${v.id}` === row.word_id)
    if (!vocab || !mod) return []
    return [{ wordId: row.word_id, moduleSlug: row.module_slug, track: mod.track, ...vocab }]
  })
  const dueCounts = {
    ela: allDueCards.filter(card => card.track === 'ela').length,
    esl: allDueCards.filter(card => card.track === 'esl').length,
  }
  const cards = allDueCards.filter(card => card.track === currentMode).slice(0, 10)
  const globallyCaughtUp = englishTracks.every(track => dueCounts[track] === 0)
  const otherTrackWithWork = englishTracks.find(track => track !== currentMode && dueCounts[track] > 0)
  const dueModeNav = (
    <nav aria-label="English practice queues" className="mb-5 grid grid-cols-2 gap-2">
      {englishTracks.map(track => (
        <Link
          key={track}
          href={`/practice?mode=${track}`}
          aria-current={track === currentMode ? 'page' : undefined}
          className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold ${
            track === currentMode
              ? 'border-green-600 bg-green-50 text-green-800'
              : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          {track.toUpperCase()} · {formatDueWordCount(dueCounts[track])}
        </Link>
      ))}
    </nav>
  )

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
        {dueModeNav}
        <div className="text-center py-8">
          <div className="text-5xl mb-4">{globallyCaughtUp ? '✅' : '↗️'}</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">
            {globallyCaughtUp ? 'All caught up!' : `No ${currentMode.toUpperCase()} words due`}
          </h2>
          <p className="text-gray-500 mb-8">
            {otherTrackWithWork
              ? `${formatDueWordCount(dueCounts[otherTrackWithWork])} in ${otherTrackWithWork.toUpperCase()}.`
              : 'No words to review right now.'}
          </p>
          {otherTrackWithWork ? (
            <Link
              href={`/practice?mode=${otherTrackWithWork}`}
              className="inline-block bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors"
            >
              Practice {otherTrackWithWork.toUpperCase()} →
            </Link>
          ) : <a
            href={currentMode === 'ela' ? '/vine-app/modules?mode=ela' : '/vine-app/modules'}
            className="inline-block bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors"
          >
              Go learn something new →
          </a>}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Practice</h1>
          <p className="text-gray-500 text-sm">{formatDueWordCount(dueCounts[currentMode])}</p>
        </div>
        <ModeToggle currentMode={currentMode} availableTracks={tracks} />
      </div>
      {dueModeNav}
      <PracticeClient cards={cards} isEsl={currentMode === 'esl'} />
    </div>
  )
}
