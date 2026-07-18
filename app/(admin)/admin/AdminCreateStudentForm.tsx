'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminCreateStudentForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setIsError(false)

    try {
      const response = await fetch('/vine-app/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsError(true)
        setMessage(data.error || 'Could not create student.')
        return
      }

      const createdName = String(data.student?.name ?? name.trim())
      setName('')
      setPin('')
      setMessage(`${createdName} can now sign in with the PIN you set.`)
      router.refresh()
    } catch {
      setIsError(true)
      setMessage('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Add student</h2>
        <p className="text-sm text-slate-500">
          Create the student&apos;s login first. They will choose their learning tracks when they sign in.
        </p>
      </div>

      <form onSubmit={createStudent} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="block text-xs font-semibold text-slate-600">
          <span className="mb-1 block">Student name</span>
          <input
            type="text"
            value={name}
            onChange={event => {
              setName(event.target.value)
              setMessage('')
            }}
            minLength={2}
            maxLength={80}
            required
            autoComplete="off"
            placeholder="e.g. Maria"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-600">
          <span className="mb-1 block">4-digit PIN</span>
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
          {saving ? 'Creating...' : 'Create student'}
        </button>
      </form>

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
