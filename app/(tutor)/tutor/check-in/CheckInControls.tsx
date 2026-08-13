'use client'

import { useState } from 'react'

interface StudentRow {
  id: string
  name: string
  present: boolean | null
  recordedByName: string | null
}

function PresenceToggle({
  present,
  onChange,
  disabled,
  label,
}: {
  present: boolean | null
  onChange: (next: boolean) => void
  disabled: boolean
  label: string
}) {
  return (
    <div className="flex rounded-lg border border-amber-200 bg-white p-0.5" role="group" aria-label={label}>
      {([
        { value: true, text: 'Here' },
        { value: false, text: 'Absent' },
      ] as const).map(option => (
        <button
          key={option.text}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={present === option.value}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
            present === option.value
              ? option.value
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-500 text-white shadow-sm'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          {option.text}
        </button>
      ))}
    </div>
  )
}

export default function CheckInControls({
  date,
  tutorName,
  initialSelfPresent,
  initialStudents,
}: {
  date: string
  tutorName: string
  initialSelfPresent: boolean | null
  initialStudents: StudentRow[]
}) {
  const [selfPresent, setSelfPresent] = useState(initialSelfPresent)
  const [students, setStudents] = useState(initialStudents)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function send(body: Record<string, unknown>, key: string, revert: () => void) {
    setPending(key)
    setError('')
    try {
      const response = await fetch('/vine-app/api/tutor/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...body }),
      })
      if (!response.ok) throw new Error('Check-in failed')
    } catch {
      revert()
      setError('Could not save that check-in. Please try again.')
    } finally {
      setPending(null)
    }
  }

  function checkInSelf(next: boolean) {
    const previous = selfPresent
    setSelfPresent(next)
    void send({ subject: 'self', present: next }, 'self', () => setSelfPresent(previous))
  }

  const unmarked = students.filter(student => student.present === null).length

  function checkInStudent(studentId: string, next: boolean) {
    const previous = students
    setStudents(rows => rows.map(row => (
      row.id === studentId ? { ...row, present: next, recordedByName: tutorName } : row
    )))
    void send(
      { subject: 'student', studentId, present: next },
      studentId,
      () => setStudents(previous),
    )
  }

  const presentCount = students.filter(student => student.present === true).length

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-gray-700">Your check-in</h2>
        <p className="mt-0.5 text-xs text-gray-400">Admins see this on the program check-in board.</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">
            {tutorName}
            {selfPresent === null && <span className="ml-2 text-xs text-gray-400">Not checked in</span>}
          </span>
          <PresenceToggle
            present={selfPresent}
            onChange={checkInSelf}
            disabled={pending === 'self'}
            label="Your own check-in"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-gray-700">Students</h2>
          <p className="text-xs text-gray-400">
            {presentCount} of {students.length} here
            {unmarked > 0 ? ` · ${unmarked} not marked yet` : ''}
          </p>
        </div>
        {students.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No students on your roster. Switch to All students above for substitute coverage.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {students.map(student => (
              <div key={student.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">{student.name}</p>
                  <p className="text-xs text-gray-400">
                    {student.present === null
                      ? 'Not marked yet'
                      : student.recordedByName ? `Marked by ${student.recordedByName}` : 'Marked'}
                  </p>
                </div>
                <PresenceToggle
                  present={student.present}
                  onChange={next => checkInStudent(student.id, next)}
                  disabled={pending === student.id}
                  label={`Check-in for ${student.name}`}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
