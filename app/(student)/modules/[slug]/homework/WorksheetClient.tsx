'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Module } from '@/types'
import { getMatchingItems } from '@/lib/worksheet'
import { clearDraft, loadDraft, LONG_FORM_DRAFT_TTL_MS, saveDraft, userDraftKey } from '@/lib/resumable-work'

interface Props {
  mod: Module
  userId: string
}

type WorksheetDraft = {
  matching: Record<string, string>
  fillIn: Record<string, string>
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(item => typeof item === 'string')
}

function isWorksheetDraft(value: unknown): value is WorksheetDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<WorksheetDraft>
  return isStringRecord(draft.matching) && isStringRecord(draft.fillIn)
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function WorksheetClient({ mod, userId }: Props) {
  const router = useRouter()
  const draftKey = useMemo(() => userDraftKey(userId, 'worksheet', mod.slug), [mod.slug, userId])
  const [matchingItems] = useState(() => getMatchingItems(mod))
  const [shuffledEs] = useState(() => shuffle(matchingItems.map(v => v.es ?? '')))
  const hasMatching = matchingItems.length > 0
  const [matching, setMatching] = useState<Record<string, string>>({})
  const [fillIn, setFillIn] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const draft = loadDraft(window.localStorage, draftKey, isWorksheetDraft, LONG_FORM_DRAFT_TTL_MS)
      if (draft) {
        setMatching(draft.matching)
        setFillIn(draft.fillIn)
      }
    } catch {
      // Start with an empty worksheet when browser storage is unavailable.
    } finally {
      setDraftLoaded(true)
    }
  }, [draftKey])

  useEffect(() => {
    if (!draftLoaded || score !== null) return
    try {
      saveDraft(window.localStorage, draftKey, { matching, fillIn })
    } catch {
      // The worksheet remains usable even when browser storage is unavailable.
    }
  }, [draftKey, draftLoaded, fillIn, matching, score])

  const allMatched = !hasMatching || matchingItems.every(v => matching[v.id])
  const allFilled = mod.worksheet.every(q => fillIn[q.id]?.trim())
  const canSubmit = allMatched && allFilled && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/vine-app/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'homework_completed',
          data: {
            moduleSlug: mod.slug,
            matchingAnswers: matchingItems.map(v => ({ vocabId: v.id, selectedEs: matching[v.id] ?? '' })),
            fillInBlankAnswers: mod.worksheet.map(q => ({ questionId: q.id, answer: fillIn[q.id] ?? '' })),
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || typeof json.score !== 'number') {
        throw new Error(typeof json.error === 'string' ? json.error : 'Homework could not be saved')
      }
      try {
        clearDraft(window.localStorage, draftKey)
      } catch {
        // The server result is authoritative even if local cleanup fails.
      }
      setScore(json.score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Homework could not be saved. Your answers are still here.')
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
        <h2 className="text-2xl font-bold text-green-800 mb-2">Homework Complete!</h2>
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
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-gray-400 text-2xl">←</button>
        <h1 className="font-bold text-green-800">{mod.titleEn} — Homework</h1>
      </div>

      <p className="text-xs text-gray-400 -mt-4">
        Need a refresher first? <a href={`/vine-app/modules/${mod.slug}/review`} className="text-green-700 underline">Review the slides</a>.
      </p>

      {/* Matching */}
      {hasMatching && (
        <section>
          <h2 className="font-bold text-gray-700 mb-1">1. Matching</h2>
          <p className="text-xs text-gray-400 mb-3">Match each English word to its Spanish translation.</p>
          <div className="space-y-3">
            {matchingItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
                <p className="font-medium text-gray-800 flex-1">{item.en}</p>
                <select
                  value={matching[item.id] ?? ''}
                  onChange={e => setMatching(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700"
                >
                  <option value="">Select...</option>
                  {shuffledEs.map(es => (
                    <option key={es} value={es}>{es}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fill in the Blank */}
      <section>
        <h2 className="font-bold text-gray-700 mb-1">{hasMatching ? '2.' : '1.'} Fill in the Blank</h2>
        <p className="text-xs text-gray-400 mb-3">Write the missing word in English.</p>
        <div className="space-y-3">
          {mod.worksheet.map(q => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="font-medium text-gray-800">{q.promptEn}</p>
              {q.promptEs && <p className="text-xs text-gray-400 mt-0.5">{q.promptEs}</p>}
              <input
                type="text"
                value={fillIn[q.id] ?? ''}
                onChange={e => setFillIn(prev => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Type your answer"
              />
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full text-lg font-semibold py-4 rounded-2xl shadow active:scale-95 transition-transform ${
          canSubmit ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {submitting ? 'Saving...' : 'Submit Homework'}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}
