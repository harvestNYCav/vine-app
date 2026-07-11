'use client'

import { useState, useEffect } from 'react'

interface Note {
  id: string
  body: string
  created_at: number
  tutor_name: string
}

interface Props {
  studentId: string
}

export default function PrepNoteButton({ studentId }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const PREVIEW_COUNT = 3
  const visibleNotes = expanded ? notes : notes.slice(0, PREVIEW_COUNT)
  const hiddenCount = notes.length - PREVIEW_COUNT

  useEffect(() => {
    fetch(`/vine-app/api/tutor/student-note?studentId=${studentId}`)
      .then(r => r.json())
      .then(d => setNotes(d.notes ?? []))
  }, [studentId])

  const handleSave = async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/vine-app/api/tutor/student-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, body: draft }),
      })
      if (res.ok) {
        const refreshed = await fetch(`/vine-app/api/tutor/student-note?studentId=${studentId}`)
        const data = await refreshed.json()
        setNotes(data.notes ?? [])
        setDraft('')
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {notes.length > 0 && (
        <div className="space-y-2">
          {visibleNotes.map(note => (
            <div key={note.id} className="bg-white border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {note.tutor_name} · {new Date(Number(note.created_at)).toLocaleDateString()}
              </p>
            </div>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button onClick={() => setExpanded(true)} className="text-xs text-amber-600 hover:text-amber-800">
              Show {hiddenCount} older {hiddenCount === 1 ? 'note' : 'notes'}
            </button>
          )}
          {expanded && notes.length > PREVIEW_COUNT && (
            <button onClick={() => setExpanded(false)} className="text-xs text-amber-600 hover:text-amber-800">
              Show less
            </button>
          )}
        </div>
      )}

      {open ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Focus areas for next session..."
            rows={3}
            className="w-full text-sm border border-amber-300 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save note'}
            </button>
            <button
              onClick={() => { setOpen(false); setDraft('') }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-amber-600 hover:text-amber-800 font-medium"
        >
          + Add note
        </button>
      )}
    </div>
  )
}
