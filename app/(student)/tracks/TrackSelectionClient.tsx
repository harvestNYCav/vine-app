'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRACKS } from '@/lib/tracks'
import type { Track } from '@/types'

export default function TrackSelectionClient({ initialTracks }: { initialTracks: Track[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Track[]>(initialTracks)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleTrack = (track: Track) => {
    setSelected(prev => (
      prev.includes(track)
        ? prev.filter(t => t !== track)
        : [...prev, track]
    ))
    setError('')
  }

  const saveTracks = async () => {
    if (selected.length === 0) {
      setError('Choose at least one track.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/vine-app/api/student/tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: selected }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Could not save tracks.')
      setSaving(false)
      return
    }
    router.push(data.nextPath || '/home')
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Student setup</p>
        <h1 className="text-2xl font-bold text-green-800">Choose your tracks</h1>
      </div>

      <div className="space-y-3">
        {TRACKS.map(track => {
          const active = selected.includes(track.id)
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => toggleTrack(track.id)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-colors ${
                active ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 hover:border-green-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-sm font-bold ${
                  active ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-300 text-white'
                }`}>
                  ✓
                </span>
                <div>
                  <p className="font-bold text-gray-800">{track.label}</p>
                  <p className="text-sm text-gray-500">{track.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

      <button
        type="button"
        onClick={saveTracks}
        disabled={saving}
        className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform mt-6 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Start learning'}
      </button>
    </div>
  )
}
