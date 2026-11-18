'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { matchesSearch } from '@/lib/search'
import { formatWordCount } from '@/lib/study'

export type StudentCardData = {
  id: string
  name: string
  daysSince: number | null
  completedModules: number
  totalModules: number
  vocabMastered: number
  reviewedModules: number
}

export default function StudentList({ students }: { students: StudentCardData[] }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => students.filter(student => matchesSearch(query, [student.name])),
    [students, query],
  )

  if (students.length === 0) return null

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search students by name</span>
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') setQuery('') }}
          placeholder={`Search ${students.length} students…`}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
        />
      </label>

      {query.trim() && filtered.length > 0 && (
        <p className="text-xs text-gray-400">
          {filtered.length} of {students.length} students
        </p>
      )}

      {filtered.length === 0 && (
        <p className="px-1 py-3 text-sm text-gray-400">No students match “{query.trim()}”.</p>
      )}

      {filtered.map(student => (
        <Link key={student.id} href={`/tutor/${student.id}`} className="block">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl font-bold text-amber-700">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{student.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {student.daysSince === null ? 'No activity yet' :
                   student.daysSince === 0 ? 'Active today' :
                   student.daysSince === 1 ? 'Active yesterday' :
                   `${student.daysSince} days ago`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-green-700">{student.completedModules}/{student.totalModules}</p>
                <p className="text-xs text-gray-400">English lessons</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <span className="text-xs text-blue-500">📚</span>
                <span className="text-xs text-gray-500">{formatWordCount(student.vocabMastered)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-purple-500">📖</span>
                <span className="text-xs text-gray-500">{student.reviewedModules} reviewed</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
