'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TutorRosterScope } from '@/lib/tutor-roster'

export default function TutorRosterScopeToggle({ scope }: { scope: TutorRosterScope }) {
  const router = useRouter()
  const [saving, setSaving] = useState<TutorRosterScope | null>(null)
  const [error, setError] = useState('')

  async function updateScope(nextScope: TutorRosterScope) {
    if (nextScope === scope || saving) return
    setSaving(nextScope)
    setError('')
    try {
      const response = await fetch('/vine-app/api/tutor/roster-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: nextScope }),
      })
      if (!response.ok) throw new Error('Unable to update roster')
      router.refresh()
    } catch {
      setError('Could not update roster view.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-amber-900">Roster</span>
      <div className="flex rounded-lg border border-amber-200 bg-white p-0.5" aria-label="Tutor roster view">
        {([
          { value: 'assigned', label: 'My students' },
          { value: 'all', label: 'All students' },
        ] as const).map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => void updateScope(option.value)}
            disabled={saving !== null}
            aria-pressed={scope === option.value}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              scope === option.value
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            {saving === option.value ? 'Loading...' : option.label}
          </button>
        ))}
      </div>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  )
}
