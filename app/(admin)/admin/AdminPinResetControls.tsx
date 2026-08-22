'use client'

import { FormEvent, useState } from 'react'

interface ProfileOption {
  id: string
  name: string
  role: 'student' | 'tutor' | 'parent'
}

export default function AdminPinResetControls({ profiles }: { profiles: ProfileOption[] }) {
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function resetPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setIsError(false)

    try {
      const response = await fetch('/vine-app/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsError(true)
        setMessage(data.error || 'Could not reset the PIN.')
        return
      }

      const name = String(data.user?.name ?? 'That profile')
      setPin('')
      setMessage(`${name} can now sign in with the new PIN. Share it with them.`)
    } catch {
      setIsError(true)
      setMessage('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Reset a PIN</h2>
        <p className="text-sm text-slate-500">
          For a student, tutor or parent who has forgotten theirs. The old PIN stops working right away.
        </p>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-slate-400">No profiles yet.</p>
      ) : (
        <form onSubmit={resetPin} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <label className="block text-xs font-semibold text-slate-600">
            <span className="mb-1 block">Profile</span>
            <select
              value={userId}
              onChange={event => {
                setUserId(event.target.value)
                setMessage('')
              }}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            >
              <option value="">Choose a profile</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.role}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            <span className="mb-1 block">New 4-digit PIN</span>
            <input
              type="password"
              value={pin}
              onChange={event => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                setMessage('')
              }}
              inputMode="numeric"
              pattern="[0-9]{4}"
              minLength={4}
              maxLength={4}
              required
              autoComplete="new-password"
              placeholder="••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-[0.3em] outline-none focus:border-slate-500"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {saving ? 'Resetting...' : 'Reset PIN'}
          </button>
        </form>
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
