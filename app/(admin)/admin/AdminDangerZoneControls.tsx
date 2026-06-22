'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileOption {
  id: string
  name: string
  role: 'student' | 'tutor'
}

export default function AdminDangerZoneControls({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter()
  const [pendingProfile, setPendingProfile] = useState<ProfileOption | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetText, setResetText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const deleteProfile = async () => {
    if (!pendingProfile) return
    setBusy(true)
    setMessage('')
    const res = await fetch('/vine-app/api/admin/reset', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pendingProfile.id }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setMessage(data.error || 'Could not delete profile.')
      return
    }
    setMessage(`${pendingProfile.name} was deleted.`)
    setPendingProfile(null)
    router.refresh()
  }

  const resetAll = async () => {
    setBusy(true)
    setMessage('')
    const res = await fetch('/vine-app/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: resetText }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setMessage(data.error || 'Could not reset database.')
      return
    }
    window.location.href = '/vine-app/login?role=admin'
  }

  return (
    <section className="bg-white border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col gap-1 mb-4">
        <p className="text-sm font-semibold text-red-700">Danger zone</p>
        <h2 className="text-lg font-bold text-slate-900">Reset data</h2>
        <p className="text-sm text-slate-500">Delete test profiles or clear the entire database.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-800 mb-2">Delete one profile</p>
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-400">No student or tutor profiles to delete.</p>
          ) : (
            <div className="space-y-2">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{profile.name}</p>
                    <p className="text-xs text-slate-400">{profile.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingProfile(profile)
                      setMessage('')
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-red-200 p-3">
          <p className="text-sm font-semibold text-slate-800">Full database reset</p>
          <p className="mt-1 text-xs text-slate-500">Deletes every user and all progress, then restores the default admin email allowlist and test accounts.</p>
          <button
            type="button"
            onClick={() => {
              setResetOpen(true)
              setPendingProfile(null)
              setMessage('')
            }}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Reset entire database
          </button>
        </div>
      </div>

      {pendingProfile && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">Delete {pendingProfile.name}?</p>
          <p className="mt-1 text-sm text-red-700">This permanently removes this {pendingProfile.role} profile and related progress or assignments.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={deleteProfile}
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Deleting...' : 'Yes, delete profile'}
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

      {resetOpen && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">Reset the entire database?</p>
          <p className="mt-1 text-sm text-red-700">
            This deletes all admins, tutors, students, progress, attendance, sessions, and verification codes. It then creates TestStudentELA, TestStudentESL, TestStudentMath, and TestTutor with PIN 1234.
          </p>
          <label className="mt-3 block text-xs font-semibold text-red-800">
            Type RESET to confirm
            <input
              value={resetText}
              onChange={e => setResetText(e.target.value)}
              className="mt-1 block w-full max-w-xs rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={resetAll}
              disabled={busy || resetText !== 'RESET'}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? 'Resetting...' : 'Reset database'}
            </button>
            <button
              type="button"
              onClick={() => {
                setResetOpen(false)
                setResetText('')
              }}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-xs text-slate-500">{message}</p>}
    </section>
  )
}
