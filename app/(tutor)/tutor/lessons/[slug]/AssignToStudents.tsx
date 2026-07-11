'use client'

import { useState } from 'react'

interface Student {
  id: string
  name: string
}

interface Props {
  moduleSlug: string
  today: string
  nextDate: string
  students: Student[]
}

export default function AssignToStudents({ moduleSlug, today, nextDate, students }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<'today' | 'next' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function assign(date: string, which: 'today' | 'next') {
    if (checked.size === 0) {
      setMessage('Select at least one student first.')
      return
    }
    setSaving(which)
    setMessage(null)
    try {
      const res = await fetch('/vine-app/api/tutor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleSlug, date, studentIds: [...checked] }),
      })
      if (res.ok) {
        setMessage(`Assigned to ${checked.size} student${checked.size === 1 ? '' : 's'} for ${date}.`)
      } else {
        setMessage('Something went wrong. Try again.')
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to students</p>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {students.map(s => (
          <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked.has(s.id)}
              onChange={() => toggle(s.id)}
              className="w-4 h-4 accent-amber-600"
            />
            <span className="text-sm text-gray-800">{s.name}</span>
          </label>
        ))}
        {students.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">No students yet.</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => assign(today, 'today')}
          disabled={saving !== null}
          className="flex-1 bg-amber-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving === 'today' ? 'Saving...' : "📌 Assign to Today's Session"}
        </button>
        <button
          onClick={() => assign(nextDate, 'next')}
          disabled={saving !== null}
          className="flex-1 bg-white border border-amber-300 text-amber-700 text-sm font-semibold py-3 rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          {saving === 'next' ? 'Saving...' : `📌 Assign to Next Session (${nextDate})`}
        </button>
      </div>

      {message && <p className="text-sm text-center text-gray-600">{message}</p>}
    </div>
  )
}
