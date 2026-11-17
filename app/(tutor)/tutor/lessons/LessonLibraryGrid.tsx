'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { matchesSearch } from '@/lib/search'

export interface LibraryLesson {
  slug: string
  number: number
  emoji: string
  title: string
  subtitle?: string
  wordCount: string
}

// Searchable grid of ESL lessons; each box opens the lesson preview.
export default function LessonLibraryGrid({ lessons }: { lessons: LibraryLesson[] }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => lessons.filter(lesson => matchesSearch(query, [lesson.number, lesson.title, lesson.subtitle])),
    [lessons, query],
  )

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-600">ESL lessons</h2>
        <span className="text-xs text-gray-400">
          {filtered.length === lessons.length ? `${lessons.length} lessons` : `${filtered.length} of ${lessons.length}`}
        </span>
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
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No lessons match “{query.trim()}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(lesson => (
            <Link
              key={lesson.slug}
              href={`/tutor/lessons/${lesson.slug}`}
              className="flex min-h-[7.5rem] flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:border-amber-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-lg">{lesson.emoji}</span>
                <span className="text-[11px] font-semibold text-amber-600">Lesson {lesson.number}</span>
              </span>
              <span className="mt-2 block text-sm font-semibold leading-snug text-gray-800">{lesson.title}</span>
              {lesson.subtitle && <span className="mt-0.5 block text-xs leading-snug text-gray-400">{lesson.subtitle}</span>}
              <span className="mt-auto pt-2 text-[11px] text-gray-400">{lesson.wordCount}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
