'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExamSubject } from '@/lib/exam-assignments'

interface Props {
  studentId: string
  subject: ExamSubject
  examId: string
  sectionSlug: string
  assigned: boolean
}

export default function ExamAssignButton({ studentId, subject, examId, sectionSlug, assigned }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/tutor/exam-assignment', {
        method: assigned ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subject, examId, sectionSlug }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not save. Try again.')
      // Re-render the server page so the Scheduled Lessons card and every button for this section agree.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={saving}
        className={assigned
          ? 'text-xs font-medium text-gray-500 underline hover:text-gray-700 disabled:opacity-50'
          : 'rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50'}
      >
        {saving ? 'Saving...' : assigned ? 'Remove' : 'Assign today'}
      </button>
      {error && <span role="alert" className="mt-1 text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
