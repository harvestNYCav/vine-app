'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { matchesSearch } from '@/lib/search'

interface LessonOption {
  slug: string
  number: number
  title: string
  subtitle?: string
}

interface Props {
  studentId: string
  lessons: LessonOption[]
  scheduledSlugs: string[]
}

// Lets a tutor tick several lessons for this student and add them all to today's session at once,
// instead of assigning them one by one from the Lesson Library.
export default function AssignLessonsPicker({ studentId, lessons, scheduledSlugs }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const scheduled = new Set(scheduledSlugs)

  // Every search word must match the number, English title or Spanish title.
  const filtered = useMemo(
    () => lessons.filter(lesson => matchesSearch(query, [lesson.number, lesson.title, lesson.subtitle])),
    [lessons, query],
  )

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
          moduleSlugs: lessons.map(lesson => lesson.slug).filter(slug => checked.has(slug)),
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
        <p className="text-sm font-semibold text-gray-700">Pick ESL lessons for today</p>
        <button
          type="button"
          onClick={close}
          className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      <div className="relative mb-3">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search lessons (English or Spanish)"
          aria-label="Search lessons"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
      </div>
      <div className="max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No lessons match “{query.trim()}”.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(lesson => {
              const alreadyScheduled = scheduled.has(lesson.slug)
              const selected = checked.has(lesson.slug)
              return (
                <label
                  key={lesson.slug}
                  className={`relative flex min-h-[4.5rem] flex-col rounded-xl border-2 p-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-300 ${
                    alreadyScheduled
                      ? 'cursor-default border-green-200 bg-green-50/60'
                      : selected
                        ? 'cursor-pointer border-amber-500 bg-amber-50'
                        : 'cursor-pointer border-gray-100 bg-white hover:border-amber-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={alreadyScheduled || selected}
                    disabled={alreadyScheduled}
                    onChange={() => toggle(lesson.slug)}
                    className="sr-only"
                  />
                  <span className="flex items-start justify-between gap-1">
                    <span className="text-[11px] font-semibold text-amber-600">Lesson {lesson.number}</span>
                    {alreadyScheduled ? (
                      <span className="text-[11px] font-medium text-green-700">Scheduled</span>
                    ) : (
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[10px] leading-none ${
                          selected ? 'border-amber-600 bg-amber-600 text-white' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {selected ? '✓' : ''}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-gray-800">{lesson.title}</span>
                  {lesson.subtitle && <span className="mt-0.5 block text-xs leading-snug text-gray-400">{lesson.subtitle}</span>}
                </label>
              )
            })}
          </div>
        )}
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
