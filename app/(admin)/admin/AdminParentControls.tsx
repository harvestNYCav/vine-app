'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminParentRow } from '@/lib/parents'

interface StudentOption {
  id: string
  name: string
}

function ParentRow({ parent, students }: { parent: AdminParentRow; students: StudentOption[] }) {
  const router = useRouter()
  const [studentIds, setStudentIds] = useState<string[]>(parent.childIds)
  const [spanishEnabled, setSpanishEnabled] = useState(parent.spanishEnabled)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const toggleStudent = (studentId: string) => {
    setStudentIds(previous => (
      previous.includes(studentId)
        ? previous.filter(id => id !== studentId)
        : [...previous, studentId]
    ))
    setMessage('')
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/vine-app/api/admin/parents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: parent.id, studentIds, spanishEnabled }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setMessage(data.error || 'Could not save.')
        return
      }
      setMessage('Saved')
      router.refresh()
    } catch {
      setMessage('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-900">{parent.name}</h3>
        <p className="text-xs text-slate-500">
          {studentIds.length === 0
            ? 'No student linked yet'
            : `${studentIds.length} student${studentIds.length === 1 ? '' : 's'} linked`}
        </p>
      </div>

      <p className="mb-1 text-xs font-medium text-slate-500">Students this parent can see</p>
      {students.length === 0 ? (
        <p className="text-xs text-slate-400">No students yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {students.map(student => {
            const active = studentIds.includes(student.id)
            return (
              <button
                key={student.id}
                type="button"
                onClick={() => toggleStudent(student.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'border-slate-800 bg-slate-800 text-white' : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {student.name}
              </button>
            )
          })}
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={spanishEnabled}
          onChange={event => {
            setSpanishEnabled(event.target.checked)
            setMessage('')
          }}
          className="h-4 w-4 accent-slate-800"
        />
        Show the Spanish toggle in this parent&apos;s view (independent of the student&apos;s own setting)
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && <span className="text-xs text-gray-500">{message}</span>}
      </div>
    </div>
  )
}

export default function AdminParentControls({
  parents,
  students,
}: {
  parents: AdminParentRow[]
  students: StudentOption[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function createParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setIsError(false)

    try {
      const response = await fetch('/vine-app/api/admin/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsError(true)
        setMessage(data.error || 'Could not create parent.')
        return
      }

      const createdName = String(data.parent?.name ?? name.trim())
      setName('')
      setPin('')
      setMessage(`${createdName} can now sign in as a parent. Link a student below.`)
      router.refresh()
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
        <h2 className="text-lg font-bold text-slate-900">Parent accounts</h2>
        <p className="text-sm text-slate-500">
          A parent sees a read-only copy of their child&apos;s view. They cannot practice, change tracks or
          complete work.
        </p>
      </div>

      <form onSubmit={createParent} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="block text-xs font-semibold text-slate-600">
          <span className="mb-1 block">Parent name</span>
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
            placeholder="e.g. Ana Lopez"
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
          {saving ? 'Creating...' : 'Create parent'}
        </button>
      </form>

      <p
        className={`mt-3 min-h-4 text-xs ${isError ? 'text-red-600' : 'text-slate-500'}`}
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>

      {parents.length > 0 && (
        <div className="mt-4 space-y-3">
          {parents.map(parent => (
            <ParentRow key={parent.id} parent={parent} students={students} />
          ))}
        </div>
      )}
    </section>
  )
}
