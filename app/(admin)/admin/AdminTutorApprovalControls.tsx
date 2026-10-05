'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TutorSignupRequest } from '@/lib/tutor-approvals'

export default function AdminTutorApprovalControls({ requests }: { requests: TutorSignupRequest[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(requests)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function decide(request: TutorSignupRequest, approve: boolean) {
    setBusyId(request.id)
    setMessage('')
    setIsError(false)

    try {
      const response = await fetch('/vine-app/api/admin/tutor-requests', {
        method: approve ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsError(true)
        setMessage(data.error || (approve ? 'Could not approve.' : 'Could not decline.'))
        // Another admin may have handled it already, so the list is stale either way.
        if (response.status === 404) setPending(previous => previous.filter(item => item.id !== request.id))
        return
      }

      setPending(previous => previous.filter(item => item.id !== request.id))
      setMessage(approve
        ? `${request.name} can now sign in with the PIN they chose.`
        : `Declined ${request.name}.`)
      // An approved tutor joins the assignment pickers and PIN reset list below.
      if (approve) router.refresh()
    } catch {
      setIsError(true)
      setMessage('Connection error. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Tutor approvals</h2>
        <p className="text-sm text-slate-500">
          New tutors sign up with a name and PIN, then wait here until an admin approves them.
        </p>
      </div>

      <div className="space-y-2">
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">No tutors waiting for approval.</p>
        ) : pending.map(request => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{request.name}</p>
              <p className="text-xs text-slate-400">Signed up {new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => decide(request, false)}
                disabled={busyId !== ''}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 disabled:opacity-60"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => decide(request, true)}
                disabled={busyId !== ''}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {busyId === request.id ? 'Saving...' : 'Approve'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p
        className={`mt-3 min-h-4 text-xs ${isError ? 'text-red-600' : 'text-slate-500'}`}
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
    </section>
  )
}
