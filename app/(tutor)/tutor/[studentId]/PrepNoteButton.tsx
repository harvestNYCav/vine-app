'use client'

import { useState } from 'react'

interface Props {
  studentName: string
  modulesCompleted: string[]
  strugglingWords: string[]
  teachSessions: string[]
  daysSinceLastVisit: number | null
}

export default function PrepNoteButton(props: Props) {
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tutor/prep-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props),
      })
      const data = await res.json()
      setNote(data.note)
    } catch {
      setNote('Unable to generate note. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (note) {
    return (
      <div>
        <div className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{note}</div>
        <button onClick={() => setNote(null)} className="text-xs text-amber-500 mt-2 hover:text-amber-700">
          Regenerate
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-amber-700 mb-3">
        Get a personalized prep note for this Saturday&apos;s session.
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700 active:scale-95 transition-transform disabled:opacity-50"
      >
        {loading ? 'Generating...' : '✨ Generate prep note'}
      </button>
    </div>
  )
}
