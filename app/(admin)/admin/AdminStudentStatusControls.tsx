'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDayKey, nextDayKey } from '@/lib/account-visibility'

// Pause / resume and the test-account flag for one student. Unlike the placement controls above,
// these save as soon as they are used.
export default function AdminStudentStatusControls({
  studentId,
  studentName,
  isTest,
  paused,
  pausedOn,
  pausedUntil,
  today,
}: {
  studentId: string
  studentName: string
  isTest: boolean
  paused: boolean
  pausedOn: string | null
  pausedUntil: string | null
  today: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [until, setUntil] = useState(paused ? pausedUntil ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const post = async (url: string, body: object, failure: string) => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setMessage(data.error || failure)
        return false
      }
      router.refresh()
      return true
    } catch {
      setMessage('Connection error. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const pause = async () => {
    if (await post('/vine-app/api/admin/students/pause', { studentId, paused: true, until: until || null }, 'Could not pause.')) {
      setEditing(false)
    }
  }
  const resume = async () => {
    if (await post('/vine-app/api/admin/students/pause', { studentId, paused: false }, 'Could not resume.')) {
      setEditing(false)
      setUntil('')
    }
  }
  const setTest = (next: boolean) => post('/vine-app/api/admin/test-accounts', { userId: studentId, isTest: next }, 'Could not save.')

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      <p className="text-xs font-medium text-gray-500">Status</p>

      {paused && !editing ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="font-semibold">
            Paused{pausedOn ? ` since ${formatDayKey(pausedOn, today)}` : ''}
            {pausedUntil ? ` · back ${formatDayKey(pausedUntil, today)}` : ''}
          </p>
          <p className="mt-1 text-sky-800">
            Hidden from this list and left out of the counts. {studentName} comes back on their own
            {pausedUntil ? ' on that date, or' : ''} when they sign in or a tutor marks them present.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resume}
              disabled={busy}
              className="rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              Resume now
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-60"
            >
              Change back-on date
            </button>
          </div>
        </div>
      ) : editing ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <label className="block font-medium text-gray-600">
            <span className="mb-1 block">Back on (optional)</span>
            <input
              type="date"
              value={until}
              min={nextDayKey(today)}
              onChange={event => {
                setUntil(event.target.value)
                setMessage('')
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <p className="mt-1 text-gray-500">
            Leave blank to pause until you resume them. Either way they come back on their own if they
            sign in or a tutor marks them present.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pause}
              disabled={busy}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {busy ? 'Saving...' : paused ? 'Save date' : 'Pause student'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setUntil(paused ? pausedUntil ?? '' : '')
                setMessage('')
              }}
              disabled={busy}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          title="For a student who is away for a while, like a semester. Nothing is deleted."
        >
          Pause student…
        </button>
      )}

      <label className="flex items-start gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={isTest}
          disabled={busy}
          onChange={event => setTest(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <span>
          Test account
          <span className="block font-normal text-gray-400">Never counted. Hidden unless “Show test accounts” is on.</span>
        </span>
      </label>

      {message && <p className="text-xs text-red-600" role="alert">{message}</p>}
    </div>
  )
}
