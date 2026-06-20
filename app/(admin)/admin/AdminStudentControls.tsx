'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRACKS } from '@/lib/tracks'
import type { Track } from '@/types'

interface TutorOption {
  id: string
  name: string
}

export default function AdminStudentControls({
  studentId,
  initialTutorIds,
  initialTracks,
  tutors,
}: {
  studentId: string
  initialTutorIds: string[]
  initialTracks: Track[]
  tutors: TutorOption[]
}) {
  const router = useRouter()
  const [tutorIds, setTutorIds] = useState<string[]>(initialTutorIds)
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const toggleTutor = (tutorId: string) => {
    setTutorIds(prev => (
      prev.includes(tutorId)
        ? prev.filter(id => id !== tutorId)
        : [...prev, tutorId]
    ))
    setMessage('')
  }

  const toggleTrack = (track: Track) => {
    setTracks(prev => (
      prev.includes(track)
        ? prev.filter(t => t !== track)
        : [...prev, track]
    ))
    setMessage('')
  }

  const save = async () => {
    if (tracks.length === 0) {
      setMessage('Choose at least one track.')
      return
    }
    setSaving(true)
    setMessage('')
    const res = await fetch('/vine-app/api/admin/students', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, tutorIds, tracks }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error || 'Could not save.')
      setSaving(false)
      return
    }
    setMessage('Saved')
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Tutors</p>
        {tutors.length === 0 ? (
          <p className="text-xs text-gray-400">No tutors yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tutors.map(tutor => {
              const active = tutorIds.includes(tutor.id)
              return (
                <button
                  key={tutor.id}
                  type="button"
                  onClick={() => toggleTutor(tutor.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {tutor.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Tracks</p>
        <div className="flex flex-wrap gap-2">
          {TRACKS.map(track => {
            const active = tracks.includes(track.id)
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => toggleTrack(track.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {track.shortLabel}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && <span className="text-xs text-gray-500">{message}</span>}
      </div>
    </div>
  )
}
