'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Module } from '@/types'
import { clearDraft, loadDraft, LONG_FORM_DRAFT_TTL_MS, saveDraft, userDraftKey } from '@/lib/resumable-work'

interface Props {
  mod: Module
  userId: string
}

type QuizDraft = Record<string, string>

function isQuizDraft(value: unknown): value is QuizDraft {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(item => typeof item === 'string')
}

export default function QuizClient({ mod, userId }: Props) {
  const router = useRouter()
  const draftKey = useMemo(() => userDraftKey(userId, 'quiz', mod.slug), [mod.slug, userId])
  const [answers, setAnswers] = useState<QuizDraft>({})
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const draft = loadDraft(window.localStorage, draftKey, isQuizDraft, LONG_FORM_DRAFT_TTL_MS)
      if (draft) setAnswers(draft)
    } catch {
      // Start with a blank quiz when browser storage is unavailable.
    } finally {
      setDraftLoaded(true)
    }
  }, [draftKey])

  useEffect(() => {
    if (!draftLoaded || score !== null) return
    try {
      saveDraft(window.localStorage, draftKey, answers)
    } catch {
      // The quiz remains usable even when browser storage is unavailable.
    }
  }, [answers, draftKey, draftLoaded, score])

  const allAnswered = mod.quiz.every(q => answers[q.id])
  const canSubmit = allAnswered && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/vine-app/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'practice_completed',
          data: {
            moduleSlug: mod.slug,
            answers: mod.quiz.map(q => ({ questionId: q.id, answer: answers[q.id] ?? '' })),
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || typeof json.score !== 'number') {
        throw new Error(typeof json.error === 'string' ? json.error : 'Quiz could not be saved')
      }
      try {
        clearDraft(window.localStorage, draftKey)
      } catch {
        // The server result is authoritative even if local cleanup fails.
      }
      setScore(json.score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz could not be saved. Your answers are still here.')
    } finally {
      setSubmitting(false)
    }
  }

  if (score !== null) {
    const isPerfect = score === 100
    const isGood = score >= 60

    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">{isPerfect ? '🏆' : isGood ? '🌟' : '💪'}</div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">Quick Check Complete!</h2>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 my-6">
          <p className="text-5xl font-bold text-green-700 mb-1">{score}%</p>
        </div>
        <a href={`/vine-app/modules/${mod.slug}`} className="block">
          <button className="w-full bg-gray-100 text-gray-700 text-base font-medium py-3 rounded-2xl">
            ← Back to lesson
          </button>
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 text-2xl">←</button>
        <h1 className="font-bold text-green-800">{mod.titleEn} — Quick Check</h1>
      </div>

      <div className="space-y-4">
        {mod.quiz.map((q, index) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Question {index + 1} of {mod.quiz.length}</p>
            <p className="font-medium text-gray-800">{q.promptEn}</p>
            {q.promptEs && <p className="text-xs text-gray-400 mt-0.5">{q.promptEs}</p>}

            {q.type === 'multiple-choice' && q.options ? (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {q.options.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                    aria-pressed={answers[q.id] === option}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors ${
                      answers[q.id] === option
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Type your answer"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full text-lg font-semibold py-4 rounded-2xl shadow active:scale-95 transition-transform ${
          canSubmit ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {submitting ? 'Saving...' : 'Submit Quiz'}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
