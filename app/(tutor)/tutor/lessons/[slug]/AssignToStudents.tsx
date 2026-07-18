'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Track } from '@/types'
import type { TutorRosterScope } from '@/lib/tutor-roster'

interface Student {
  id: string
  name: string
  tracks: Track[]
}

interface Props {
  moduleSlug: string
  moduleTrack: Exclude<Track, 'math'>
  today: string
  nextDate: string
  students: Student[]
  rosterScope: TutorRosterScope
}

interface PendingAssignment {
  date: string
  which: 'today' | 'next'
  studentIds: string[]
  missingTrackStudents: Array<{ id: string; name: string }>
  collisions: AssignmentCollision[]
}

interface AssignmentCollision {
  student: { id: string; name: string }
  lessons: Array<{ moduleSlug: string; title: string }>
}

type CollisionAction = 'replace' | 'add'

function parseStudents(value: unknown): Array<{ id: string; name: string }> {
  if (!Array.isArray(value)) return []
  return value.filter((student: unknown): student is { id: string; name: string } => (
    !!student
    && typeof student === 'object'
    && 'id' in student
    && 'name' in student
    && typeof student.id === 'string'
    && typeof student.name === 'string'
  ))
}

function parseCollisions(value: unknown): AssignmentCollision[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || !('student' in item) || !('lessons' in item)) return []
    const students = parseStudents([item.student])
    if (students.length !== 1 || !Array.isArray(item.lessons)) return []
    const lessons = item.lessons.filter((lesson: unknown): lesson is { moduleSlug: string; title: string } => (
      !!lesson
      && typeof lesson === 'object'
      && 'moduleSlug' in lesson
      && 'title' in lesson
      && typeof lesson.moduleSlug === 'string'
      && typeof lesson.title === 'string'
    ))
    return lessons.length > 0 ? [{ student: students[0], lessons }] : []
  })
}

export default function AssignToStudents({ moduleSlug, moduleTrack, today, nextDate, students, rosterScope }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<'today' | 'next' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null)

  const trackLabel = moduleTrack.toUpperCase()

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPendingAssignment(null)
    setMessage(null)
  }

  function beginAssignment(date: string, which: 'today' | 'next') {
    if (checked.size === 0) {
      setMessage('Select at least one student first.')
      return
    }

    const selectedStudents = students.filter(student => checked.has(student.id))
    void saveAssignment({
      date,
      which,
      studentIds: selectedStudents.map(student => student.id),
      missingTrackStudents: [],
      collisions: [],
    }, false)
  }

  async function saveAssignment(
    assignment: PendingAssignment,
    confirmTrackEnrollment: boolean,
    collisionAction?: CollisionAction,
  ) {
    setSaving(assignment.which)
    setMessage(null)
    try {
      const res = await fetch('/vine-app/api/tutor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleSlug,
          date: assignment.date,
          studentIds: assignment.studentIds,
          confirmTrackEnrollment,
          collisionAction,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const enrolledStudentIds = Array.isArray(data.enrolledStudentIds)
          ? data.enrolledStudentIds.filter((id: unknown): id is string => typeof id === 'string')
          : []
        const enrollmentCount = enrolledStudentIds.length
        const enrollmentMessage = enrollmentCount > 0
          ? ` Added the ${trackLabel} track to ${enrollmentCount} student${enrollmentCount === 1 ? '' : 's'}.`
          : ''
        setMessage(
          `Assigned to ${assignment.studentIds.length} student${assignment.studentIds.length === 1 ? '' : 's'} for ${assignment.date}.${enrollmentMessage}`,
        )
        setPendingAssignment(null)
        if (enrollmentCount > 0) {
          router.refresh()
        }
      } else if (res.status === 409 && (data.requiresTrackConfirmation || data.requiresCollisionConfirmation)) {
        setPendingAssignment({
          ...assignment,
          missingTrackStudents: parseStudents(data.missingTrackStudents),
          collisions: parseCollisions(data.collisions),
        })
      } else {
        setMessage(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      setMessage('Connection error. Try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to students</p>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {students.map(s => (
          <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked.has(s.id)}
              onChange={() => toggle(s.id)}
              className="w-4 h-4 accent-amber-600"
            />
            <span className="text-sm text-gray-800">{s.name}</span>
          </label>
        ))}
        {students.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">
            {rosterScope === 'assigned'
              ? 'No students are assigned to you. Use All students above for substitute coverage.'
              : 'No students yet.'}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => beginAssignment(today, 'today')}
          disabled={saving !== null}
          className="flex-1 bg-amber-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {saving === 'today' ? 'Saving...' : "📌 Assign to Today's Session"}
        </button>
        <button
          onClick={() => beginAssignment(nextDate, 'next')}
          disabled={saving !== null}
          className="flex-1 bg-white border border-amber-300 text-amber-700 text-sm font-semibold py-3 rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          {saving === 'next' ? 'Saving...' : `📌 Assign to Next Session (${nextDate})`}
        </button>
      </div>

      {pendingAssignment && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4" role="alert">
          <p className="font-semibold text-amber-900">Confirm this assignment</p>
          {pendingAssignment.missingTrackStudents.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-amber-800">
                {pendingAssignment.missingTrackStudents.length === 1 ? 'This student is' : 'These students are'} not currently enrolled in {trackLabel}:
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm font-medium text-amber-900">
                {pendingAssignment.missingTrackStudents.map(student => (
                  <li key={student.id}>{student.name}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-amber-700">
                Continuing will add {trackLabel} to their existing tracks.
              </p>
            </div>
          )}
          {pendingAssignment.collisions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-amber-800">These students already have lessons on {pendingAssignment.date}:</p>
              <ul className="mt-1 space-y-1 text-sm text-amber-900">
                {pendingAssignment.collisions.map(collision => (
                  <li key={collision.student.id}>
                    <span className="font-semibold">{collision.student.name}:</span>{' '}
                    {collision.lessons.map(lesson => lesson.title).join(', ')}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                Replace removes the listed lessons for that date. Add on top keeps them and adds this lesson too.
              </p>
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-amber-800">No changes have been made yet.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {pendingAssignment.collisions.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => saveAssignment(pendingAssignment, true, 'replace')}
                  disabled={saving !== null}
                  className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {saving === pendingAssignment.which ? 'Saving...' : 'Replace existing'}
                </button>
                <button
                  type="button"
                  onClick={() => saveAssignment(pendingAssignment, true, 'add')}
                  disabled={saving !== null}
                  className="rounded-xl border border-amber-500 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {saving === pendingAssignment.which ? 'Saving...' : 'Add on top'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => saveAssignment(pendingAssignment, true)}
                disabled={saving !== null}
                className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {saving === pendingAssignment.which ? 'Saving...' : `Add ${trackLabel} and assign`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPendingAssignment(null)}
              disabled={saving !== null}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-center text-gray-600">{message}</p>}
    </div>
  )
}
