'use client'

import { useState } from 'react'
import type { ParentChild } from '@/lib/parents'

export default function ParentChildSwitcher({
  students,
  selectedId,
}: {
  students: ParentChild[]
  selectedId: string
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function selectChild(studentId: string) {
    if (studentId === selectedId || saving) return
    setSaving(studentId)
    setError('')
    try {
      const response = await fetch('/vine-app/api/parent/child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      if (!response.ok) throw new Error('Unable to switch student')
      // A full load so every mirrored page is rebuilt for the newly chosen child.
      window.location.reload()
    } catch {
      setError('Could not switch student.')
      setSaving(null)
    }
  }

  if (students.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-sky-900">Viewing</span>
      <div className="flex flex-wrap rounded-lg border border-sky-200 bg-white p-0.5" aria-label="Choose a student">
        {students.map(child => (
          <button
            key={child.id}
            type="button"
            onClick={() => void selectChild(child.id)}
            disabled={saving !== null}
            aria-pressed={child.id === selectedId}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              child.id === selectedId ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-800 hover:bg-sky-50'
            }`}
          >
            {saving === child.id ? 'Loading...' : child.name}
          </button>
        ))}
      </div>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
