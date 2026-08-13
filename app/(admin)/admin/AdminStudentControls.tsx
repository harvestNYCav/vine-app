'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRACKS } from '@/lib/tracks'
import { GRADE_LEVELS } from '@/lib/grade-levels'
import type { TutorPairing } from '@/lib/tutor-pairings'
import type { GradeLevel, Track } from '@/types'

interface TutorOption {
  id: string
  name: string
}

export default function AdminStudentControls({
  studentId,
  initialTutorIds,
  initialTracks,
  initialMathSpanishEnabled,
  initialGradeLevel,
  tutors,
  pairings,
}: {
  studentId: string
  initialTutorIds: string[]
  initialTracks: Track[]
  initialMathSpanishEnabled: boolean
  initialGradeLevel: GradeLevel | null
  tutors: TutorOption[]
  pairings: TutorPairing[]
}) {
  const router = useRouter()
  const [tutorIds, setTutorIds] = useState<string[]>(initialTutorIds)
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [mathSpanishEnabled, setMathSpanishEnabled] = useState(initialMathSpanishEnabled)
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | null>(initialGradeLevel)
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
    if ((tracks.includes('math') || tracks.includes('ela')) && gradeLevel === null) {
      setMessage('Choose a grade level for the Math or ELA track.')
      return
    }
    setSaving(true)
    setMessage('')
    const res = await fetch('/vine-app/api/admin/students', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, tutorIds, tracks, mathSpanishEnabled, gradeLevel }),
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
        <p className="text-xs font-medium text-gray-500 mb-1">Most common pairings</p>
        {pairings.length === 0 ? (
          <p className="text-xs text-gray-400">No sessions taught yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pairings.slice(0, 4).map(pairing => {
              const alreadyAssigned = tutorIds.includes(pairing.tutorId)
              const known = tutors.some(tutor => tutor.id === pairing.tutorId)
              return (
                <button
                  key={pairing.tutorId}
                  type="button"
                  onClick={() => known && toggleTutor(pairing.tutorId)}
                  disabled={!known}
                  title={`${pairing.sessionDays} session ${pairing.sessionDays === 1 ? 'day' : 'days'} · last ${pairing.lastDate}${
                    known ? (alreadyAssigned ? ' · click to unassign' : ' · click to assign') : ''
                  }`}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
                    alreadyAssigned
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {pairing.tutorName} · {pairing.sessionDays}× · {pairing.lastDate.slice(5)}
                </button>
              )
            })}
          </div>
        )}
      </div>

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

      <label className="block text-xs font-medium text-gray-600">
        <span className="block mb-1">Student grade level</span>
        <select
          value={gradeLevel ?? ''}
          onChange={event => {
            setGradeLevel(event.target.value === '' ? null : Number(event.target.value) as GradeLevel)
            setMessage('')
          }}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Not assigned</option>
          {GRADE_LEVELS.map(grade => (
            <option key={grade} value={grade}>Grade {grade}</option>
          ))}
        </select>
        {(tracks.includes('math') || tracks.includes('ela')) && gradeLevel === null && (
          <span className="mt-1 block text-amber-700">Required for the Math or ELA track</span>
        )}
      </label>

      <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={mathSpanishEnabled}
          onChange={e => {
            setMathSpanishEnabled(e.target.checked)
            setMessage('')
          }}
          className="w-4 h-4 accent-slate-800"
        />
        Enable Spanish toggle for math
      </label>

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
