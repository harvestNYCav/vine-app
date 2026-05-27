'use client'

import { useState } from 'react'

interface Props {
  sessionDate: string
  studentId: string
  initialPresent: boolean
}

export default function AttendanceToggle({ sessionDate, studentId, initialPresent }: Props) {
  const [present, setPresent] = useState(initialPresent)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !present
    setPresent(next)
    setLoading(true)
    await fetch('/api/tutor/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionDate, studentId, present: next }),
    })
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={present ? 'Present — click to mark absent' : 'Absent — click to mark present'}
      className={`w-8 h-8 rounded-full text-sm font-bold transition-colors flex items-center justify-center mx-auto ${
        present
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      } disabled:opacity-50`}
    >
      {present ? '✓' : '–'}
    </button>
  )
}
