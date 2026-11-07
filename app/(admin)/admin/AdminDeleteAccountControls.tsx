'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { matchesSearch } from '@/lib/search'

interface ProfileOption {
  id: string
  name: string
  role: 'student' | 'tutor' | 'parent'
}

// What `deleteUserProfile` (lib/admin-reset.ts) removes for each role, in words an admin can check
// before confirming.
const DELETION_EFFECTS: Record<ProfileOption['role'], string> = {
  student: 'Their lessons, progress, scores, attendance, tutor notes and ESL placement are deleted, and they are unlinked from their tutors and parents.',
  tutor: 'They are unassigned from their students, and the lessons and exam sections they scheduled, their wrap-ups, check-ins and notes are deleted.',
  parent: 'They lose access to their children’s view. The children’s own accounts are not affected.',
}

export default function AdminDeleteAccountControls({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [pendingProfile, setPendingProfile] = useState<ProfileOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const matchingProfiles = profiles.filter(profile => matchesSearch(query, profile.name, profile.role))

  const deleteProfile = async () => {
    if (!pendingProfile) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/vine-app/api/admin/reset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingProfile.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'Could not delete account.')
        return
      }
      setMessage(`${pendingProfile.name} was deleted.`)
      setPendingProfile(null)
      router.refresh()
    } catch {
      setMessage('Connection error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Delete an account</h2>
        <p className="text-sm text-slate-500">
          Remove a student, tutor or parent who has left the program. They can no longer sign in.
        </p>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-slate-400">No student, tutor or parent accounts to delete.</p>
      ) : (
        <>
          <label className="block text-xs font-semibold text-slate-600">
            <span className="mb-1 block">Find an account</span>
            <input
              type="search"
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setMessage('')
              }}
              autoComplete="off"
              placeholder="Search by name or role"
              className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {matchingProfiles.map(profile => (
              <li key={profile.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{profile.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{profile.role}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingProfile(profile)
                    setMessage('')
                  }}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
            {matchingProfiles.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No accounts match &ldquo;{query.trim()}&rdquo;.</li>
            )}
          </ul>
        </>
      )}

      {pendingProfile && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-800">Delete {pendingProfile.name} ({pendingProfile.role})?</p>
          <p className="mt-1 text-sm text-red-700">{DELETION_EFFECTS[pendingProfile.role]} This cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={deleteProfile}
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Deleting...' : 'Yes, delete account'}
            </button>
            <button
              type="button"
              onClick={() => setPendingProfile(null)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-xs text-slate-500" aria-live="polite">{message}</p>}
    </section>
  )
}
