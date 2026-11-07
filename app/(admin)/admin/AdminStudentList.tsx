'use client'

import { ReactNode, useState } from 'react'
import { matchesSearch } from '@/lib/search'

export interface AdminStudentListItem {
  id: string
  name: string
  needsTracks: boolean
  needsTutor: boolean
  /** One-line overview, always shown. Rendered inside a button, so phrasing content only. */
  summary: ReactNode
  /** Progress and placement controls, shown when the row is opened. */
  details: ReactNode
}

type Filter = 'all' | 'needs-tracks' | 'needs-tutor'

// Every student as a collapsed row with search and "needs attention" filters, so the page stays short
// as the program grows. Closed and filtered-out rows stay mounted (just hidden), so unsaved edits in a
// student's controls survive a search or collapse.
export default function AdminStudentList({ students }: { students: AdminStudentListItem[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: students.length },
    { id: 'needs-tracks', label: 'Needs tracks', count: students.filter(student => student.needsTracks).length },
    { id: 'needs-tutor', label: 'No tutor', count: students.filter(student => student.needsTutor).length },
  ]
  const isVisible = (student: AdminStudentListItem) => (
    matchesSearch(query, student.name)
    && (filter === 'all'
      || (filter === 'needs-tracks' && student.needsTracks)
      || (filter === 'needs-tutor' && student.needsTutor))
  )
  const visibleCount = students.filter(isVisible).length

  const toggle = (id: string) => {
    setOpenIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (students.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-500">
        No students yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          autoComplete="off"
          aria-label="Search students"
          placeholder="Search students"
          className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === option.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {option.label} · {option.count}
            </button>
          ))}
        </div>
      </div>

      {students.map(student => {
        const open = openIds.has(student.id)
        return (
          <section
            key={student.id}
            hidden={!isVisible(student)}
            className="bg-white border border-slate-200 rounded-lg"
          >
            <button
              type="button"
              onClick={() => toggle(student.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-3 rounded-lg p-4 text-left hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">{student.summary}</span>
              <span className="mt-1 flex-shrink-0 text-xs font-semibold text-slate-500">{open ? 'Close ▲' : 'Open ▼'}</span>
            </button>
            <div hidden={!open} className="border-t border-slate-100 p-4">
              {student.details}
            </div>
          </section>
        )
      })}

      {visibleCount === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
          No students match{query.trim() ? <> &ldquo;{query.trim()}&rdquo;</> : null}
          {filter !== 'all' ? ` in ${filters.find(option => option.id === filter)?.label}` : ''}.
        </div>
      )}
    </div>
  )
}
