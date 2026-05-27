'use client'

import { useState } from 'react'

export default function HomeworkButton({ initialAssigned }: { initialAssigned: boolean }) {
  const [assigned, setAssigned] = useState(initialAssigned)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await fetch('/api/tutor/session/homework', { method: 'POST' })
    setAssigned(true)
    setLoading(false)
  }

  if (assigned) {
    return (
      <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
        <span className="text-green-500">✓</span> Assigned
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Saving...' : 'Mark as Assigned'}
    </button>
  )
}
