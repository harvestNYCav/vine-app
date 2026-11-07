'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { matchesSearch } from '@/lib/search'

interface ProfileOption {
  id: string
  name: string
  role: 'student' | 'tutor' | 'parent'
}

type PendingAction = { profile: ProfileOption; action: 'pin' | 'delete' }

// What `deleteUserProfile` (lib/admin-reset.ts) removes for each role, in words an admin can check
// before confirming.
const DELETION_EFFECTS: Record<ProfileOption['role'], string> = {
  student: 'Their lessons, progress, scores, attendance, tutor notes and ESL placement are deleted, and they are unlinked from their tutors and parents.',
  tutor: 'They are unassigned from their students, and the lessons and exam sections they scheduled, their wrap-ups, check-ins and notes are deleted.',
  parent: 'They lose access to their children’s view. The children’s own accounts are not affected.',
}

// One searchable list of every student, tutor and parent account, with the per-account actions an
// admin needs when someone forgets their PIN or leaves the program.
export default function AdminAccountControls({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const matchingProfiles = profiles.filter(profile => matchesSearch(query, profile.name, profile.role))

  const start = (profile: ProfileOption, action: PendingAction['action']) => {
    setPending({ profile, action })
    setPin('')
    setMessage('')
    setIsError(false)
  }

  const finish = (text: string, error: boolean) => {
    setMessage(text)
    setIsError(error)
  }

  async function resetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pending) return
    setBusy(true)
    try {
      const response = await fetch('/vine-app/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pending.profile.id, pin }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        finish(data.error || 'Could not reset the PIN.', true)
        return
      }
      const name = String(data.user?.name ?? pending.profile.name)
      setPending(null)
      setPin('')
      finish(`${name} can now sign in with the new PIN. Share it with them.`, false)
    } catch {
      finish('Connection error. Please try again.', true)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile() {
    if (!pending) return
    setBusy(true)
    try {
      const response = await fetch('/vine-app/api/admin/reset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pending.profile.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        finish(data.error || 'Could not delete account.', true)
        return
      }
      finish(`${pending.profile.name} was deleted.`, false)
      setPending(null)
      router.refresh()
    } catch {
      finish('Connection error. Please try again.', true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Accounts</h2>
        <p className="text-sm text-slate-500">
          Reset a PIN for someone who has forgotten theirs, or delete the account of someone who has left the
          program.
        </p>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-slate-400">No student, tutor or parent accounts yet.</p>
      ) : (
        <>
          <label className="block text-xs font-semibold text-slate-600">
            <span className="mb-1 block">Find an account</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoComplete="off"
              placeholder="Search by name or role"
              className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {matchingProfiles.map(profile => (
              <li key={profile.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{profile.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{profile.role}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => start(profile, 'pin')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => start(profile, 'delete')}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
            {matchingProfiles.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No accounts match &ldquo;{query.trim()}&rdquo;.</li>
            )}
          </ul>
        </>
      )}

      {pending?.action === 'pin' && (
        <form onSubmit={resetPin} className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Reset {pending.profile.name}&apos;s PIN ({pending.profile.role})</p>
          <p className="mt-1 text-sm text-slate-500">The old PIN stops working right away.</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block text-xs font-semibold text-slate-600">
              <span className="mb-1 block">New 4-digit PIN</span>
              <input
                type="password"
                value={pin}
                onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                required
                autoFocus
                autoComplete="new-password"
                placeholder="••••"
                className="w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tracking-[0.3em] outline-none focus:border-slate-500"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {busy ? 'Resetting...' : 'Reset PIN'}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {pending?.action === 'delete' && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="font-semibold text-red-800">Delete {pending.profile.name} ({pending.profile.role})?</p>
          <p className="mt-1 text-sm text-red-700">{DELETION_EFFECTS[pending.profile.role]} This cannot be undone.</p>
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
              onClick={() => setPending(null)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
