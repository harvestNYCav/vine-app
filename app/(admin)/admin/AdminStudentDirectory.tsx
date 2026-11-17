'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { StudentSchoolGradeLevel } from '@/lib/grade-levels'
import type { RegentsCourse } from '@/lib/regents-courses'
import type { TutorPairing } from '@/lib/tutor-pairings'
import type { Track } from '@/types'
import { normalizeSearchText } from '@/lib/search'
import AdminStudentControls from './AdminStudentControls'

export interface AdminStudentSummary {
  id: string
  name: string
  lastActiveLabel: string
  tracks: Track[]
  tutorIds: string[]
  tutorNames: string[]
  gradeLevel: StudentSchoolGradeLevel | null
  regentsCourses: RegentsCourse[]
  regentsCourseLabels: string[]
  mathSpanishEnabled: boolean
  completedLessons: number
  totalLessons: number
  vocabMastered: number
  reviewedModules: number
  mathProblems: number
  mathAccuracy: number
  examSectionsCompleted: number
  elaExamSectionsCompleted: number
  pairings: TutorPairing[]
}

type TrackFilter = 'all' | Track | 'none'

const TRACK_FILTERS: Array<{ id: TrackFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'esl', label: 'ESL' },
  { id: 'ela', label: 'ELA' },
  { id: 'math', label: 'Math' },
  { id: 'none', label: 'Needs tracks' },
]

const UNASSIGNED = '__unassigned__'

export default function AdminStudentDirectory({
  students,
  tutors,
}: {
  students: AdminStudentSummary[]
  tutors: Array<{ id: string; name: string }>
}) {
  const [query, setQuery] = useState('')
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [tutorFilter, setTutorFilter] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" jumps to the search box from anywhere on the page, unless the admin is already typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filtered = useMemo(() => {
    const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
    return students.filter(student => {
      if (trackFilter === 'none' && student.tracks.length > 0) return false
      if (trackFilter !== 'all' && trackFilter !== 'none' && !student.tracks.includes(trackFilter)) return false
      if (tutorFilter === UNASSIGNED && student.tutorIds.length > 0) return false
      if (tutorFilter && tutorFilter !== UNASSIGNED && !student.tutorIds.includes(tutorFilter)) return false
      if (terms.length === 0) return true
      const name = normalizeSearchText(student.name)
      return terms.every(term => name.includes(term))
    })
  }, [students, query, trackFilter, tutorFilter])

  const filtersActive = query.trim() !== '' || trackFilter !== 'all' || tutorFilter !== ''
  const clearFilters = () => {
    setQuery('')
    setTrackFilter('all')
    setTutorFilter('')
  }

  if (students.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-500">
        No students yet.
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search students by name</span>
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === 'Escape') setQuery('') }}
              placeholder="Search students by name…  (press / to focus)"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm">
            <span className="sr-only">Filter by tutor</span>
            <select
              value={tutorFilter}
              onChange={event => setTutorFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">All tutors</option>
              <option value={UNASSIGNED}>No tutor assigned</option>
              {tutors.map(tutor => (
                <option key={tutor.id} value={tutor.id}>{tutor.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {TRACK_FILTERS.map(filter => {
            const active = trackFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTrackFilter(filter.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter.label}
              </button>
            )
          })}
          <span className="ml-auto text-xs text-slate-500" aria-live="polite">
            Showing {filtered.length} of {students.length}
          </span>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-600 underline hover:text-slate-900">
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">
          No students match{query.trim() ? ` “${query.trim()}”` : ' these filters'}.{' '}
          <button type="button" onClick={clearFilters} className="font-semibold text-slate-700 underline">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(student => (
            <section key={student.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="grid lg:grid-cols-[1fr_280px] gap-5">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{student.name}</h2>
                      <p className="text-sm text-slate-500">
                        {student.lastActiveLabel} · Tutors: {
                          student.tutorNames.length > 0 ? student.tutorNames.join(', ') : 'Unassigned'
                        }
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        Grade level: {student.gradeLevel ? `Grade ${student.gradeLevel}` : 'Not assigned'}
                      </p>
                      {student.regentsCourseLabels.length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          Regents courses: {student.regentsCourseLabels.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {student.tracks.length === 0 ? (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">Needs tracks</span>
                      ) : student.tracks.map(track => (
                        <span key={track} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-semibold">{track.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-green-700">{student.completedLessons}/{student.totalLessons}</p>
                      <p className="text-xs text-slate-500">English lessons</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-blue-700">{student.vocabMastered}</p>
                      <p className="text-xs text-slate-500">Words mastered</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-purple-700">{student.reviewedModules}</p>
                      <p className="text-xs text-slate-500">Lessons reviewed</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xl font-bold text-amber-700">{student.mathProblems}</p>
                      <p className="text-xs text-slate-500">Math problems · {student.mathAccuracy}%</p>
                      <p className="mt-0.5 text-xs text-blue-600">{student.examSectionsCompleted} Math exam sections</p>
                      <p className="mt-0.5 text-xs text-purple-600">{student.elaExamSectionsCompleted} ELA exam sections</p>
                    </div>
                  </div>
                </div>

                <AdminStudentControls
                  studentId={student.id}
                  initialTutorIds={student.tutorIds}
                  initialTracks={student.tracks}
                  initialMathSpanishEnabled={student.mathSpanishEnabled}
                  initialGradeLevel={student.gradeLevel}
                  initialRegentsCourses={student.regentsCourses}
                  tutors={tutors}
                  pairings={student.pairings}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
