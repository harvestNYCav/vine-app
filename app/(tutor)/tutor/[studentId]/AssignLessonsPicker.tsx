'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { matchesSearch } from '@/lib/search'

interface LessonOption {
  slug: string
  title: string
  subtitle?: string
}

interface Props {
  studentId: string
  groups: Array<{ label: string; lessons: LessonOption[] }>
  scheduledSlugs: string[]
}

// Lets a tutor tick several lessons for this student and add them all to today's session at once,
// instead of assigning them one by one from the Lesson Library.
export default function AssignLessonsPicker({ studentId, groups, scheduledSlugs }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const scheduled = new Set(scheduledSlugs)
  // Lessons ticked before the search changed stay ticked (and get assigned) even while hidden.
  const visibleGroups = groups
    .map(group => ({
      ...group,
      lessons: group.lessons.filter(lesson => matchesSearch(query, lesson.title, lesson.subtitle, group.label)),
    }))
    .filter(group => group.lessons.length > 0)

  function close() {
    setOpen(false)
    setChecked(new Set())
    setQuery('')
    setError('')
  }

  function toggle(slug: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
    setError('')
  }

  async function assign() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/tutor/session/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send in list order (not click order) so the schedule reads the same as the picker.
        body: JSON.stringify({
          studentId,
          moduleSlugs: groups.flatMap(group => group.lessons.map(lesson => lesson.slug)).filter(slug => checked.has(slug)),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not assign. Try again.')
      close()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assign. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-amber-300 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
      >
        ＋ Assign lessons for today
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Pick lessons for today</p>
        <button
          type="button"
          onClick={close}
          className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        autoFocus
        autoComplete="off"
        aria-label="Search lessons"
        placeholder="Search lessons"
        className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
      />
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {visibleGroups.length === 0 && (
          <p className="px-1 py-2 text-sm text-gray-400">No lessons match &ldquo;{query.trim()}&rdquo;.</p>
        )}
        {visibleGroups.map(group => (
          <div key={group.label}>
            {groups.length > 1 && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">{group.label}</p>
            )}
            <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
              {group.lessons.map(lesson => {
                const alreadyScheduled = scheduled.has(lesson.slug)
                return (
                  <label
                    key={lesson.slug}
                    className={`flex items-center gap-3 px-3 py-2 ${alreadyScheduled ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={alreadyScheduled || checked.has(lesson.slug)}
                      disabled={alreadyScheduled}
                      onChange={() => toggle(lesson.slug)}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-gray-800">{lesson.title}</span>
                      {lesson.subtitle && <span className="block text-xs text-gray-400">{lesson.subtitle}</span>}
                    </span>
                    {alreadyScheduled && <span className="text-xs font-medium text-green-700">Scheduled</span>}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void assign()}
        disabled={saving || checked.size === 0}
        className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {saving
          ? 'Saving...'
          : checked.size === 0
            ? 'Pick lessons above'
            : `📌 Assign ${checked.size} lesson${checked.size === 1 ? '' : 's'} for today`}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
