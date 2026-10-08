'use client'

import { useState } from 'react'
import type { SessionWrapUp } from '@/lib/session-metrics'

interface Props {
  sessionId: string
  sections: string[]
  defaultQuizTotal: number | null
  // Where the slide deck got to today, if the tutor presented it.
  deckSummary: string | null
  initialWrapUp: SessionWrapUp | null
}

const RATING_LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great']

function parseCount(value: string): number | null {
  if (value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default function SessionWrapUpForm({ sessionId, sections, defaultQuizTotal, deckSummary, initialWrapUp }: Props) {
  const [saved, setSaved] = useState<SessionWrapUp | null>(initialWrapUp)
  const [editing, setEditing] = useState(false)
  const [finishedLesson, setFinishedLesson] = useState<boolean | null>(initialWrapUp?.finishedLesson ?? null)
  const [stoppedAt, setStoppedAt] = useState(initialWrapUp?.stoppedAt ?? '')
  const [quizScore, setQuizScore] = useState(initialWrapUp?.quizScore?.toString() ?? '')
  const [quizTotal, setQuizTotal] = useState(
    (initialWrapUp?.quizTotal ?? defaultQuizTotal)?.toString() ?? '',
  )
  const [rating, setRating] = useState<number | null>(initialWrapUp?.rating ?? null)
  const [note, setNote] = useState(initialWrapUp?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (finishedLesson === null || rating === null) {
      setError('Answer "Finished the lesson?" and pick a rating.')
      return
    }
    setSaving(true)
    setError('')
    const wrapUp = {
      sessionId,
      finishedLesson,
      stoppedAt: finishedLesson ? null : stoppedAt || null,
      quizScore: parseCount(quizScore),
      quizTotal: parseCount(quizTotal),
      rating,
      note,
    }
    const response = await fetch('/vine-app/api/tutor/session/wrap-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrapUp),
    })
    setSaving(false)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Could not save. Try again.')
      return
    }
    setSaved({ ...wrapUp, quizTotal: wrapUp.quizScore === null ? null : wrapUp.quizTotal, updatedAt: Date.now() })
    setEditing(false)
  }

  if (saved && !editing) {
    return (
      <div className="mt-3 rounded-lg border border-green-200 bg-white p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-green-700">✓ Wrap-up saved</p>
          <button onClick={() => setEditing(true)} className="text-xs text-amber-700 hover:text-amber-800">Edit</button>
        </div>
        <p className="mt-1 text-gray-600">
          {saved.finishedLesson ? 'Finished the lesson' : `Stopped at ${saved.stoppedAt ?? 'an unknown point'}`}
          {saved.quizScore !== null && ` · Quiz ${saved.quizScore}${saved.quizTotal !== null ? `/${saved.quizTotal}` : ''}`}
          {` · ${RATING_LABELS[saved.rating]}`}
        </p>
        {saved.note && <p className="mt-1 text-gray-500 italic">{saved.note}</p>}
      </div>
    )
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
      >
        📝 Session wrap-up
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-white p-3 text-sm">
      {deckSummary && <p className="text-xs text-gray-500">Slides today: {deckSummary}</p>}

      <div>
        <p className="mb-1 font-medium text-gray-700">Finished the lesson?</p>
        <div className="flex gap-2">
          {[true, false].map(value => (
            <button
              key={String(value)}
              onClick={() => setFinishedLesson(value)}
              className={`rounded-lg border px-4 py-1.5 ${finishedLesson === value ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-200 text-gray-600'}`}
            >
              {value ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {finishedLesson === false && (
        <label className="block">
          <span className="mb-1 block font-medium text-gray-700">Where did you stop?</span>
          <select
            value={stoppedAt}
            onChange={event => setStoppedAt(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
          >
            <option value="">Choose a section</option>
            {sections.map(section => <option key={section} value={section}>{section}</option>)}
          </select>
        </label>
      )}

      <div>
        <p className="mb-1 font-medium text-gray-700">In-person quiz score <span className="font-normal text-gray-400">(optional)</span></p>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={100} inputMode="numeric" value={quizScore}
            onChange={event => setQuizScore(event.target.value)}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1.5" aria-label="Quiz score"
          />
          <span className="text-gray-400">out of</span>
          <input
            type="number" min={0} max={100} inputMode="numeric" value={quizTotal}
            onChange={event => setQuizTotal(event.target.value)}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1.5" aria-label="Quiz total"
          />
        </div>
      </div>

      <div>
        <p className="mb-1 font-medium text-gray-700">How did it go?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(value => (
            <button
              key={value}
              onClick={() => setRating(value)}
              className={`flex-1 rounded-lg border px-1 py-1.5 text-xs ${rating === value ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-200 text-gray-600'}`}
            >
              <span className="block text-base font-semibold">{value}</span>
              {RATING_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block font-medium text-gray-700">Anything to note? <span className="font-normal text-gray-400">(optional)</span></span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="What worked, what didn't, what the student struggled with"
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
        />
      </label>

      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save wrap-up'}
        </button>
        <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </div>
  )
}
