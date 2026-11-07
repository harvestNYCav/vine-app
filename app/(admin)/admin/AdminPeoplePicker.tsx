'use client'

import { KeyboardEvent, useId, useState } from 'react'
import { matchesSearch } from '@/lib/search'

interface Person {
  id: string
  name: string
}

const MAX_SUGGESTIONS = 6

// Links people to one record (tutors to a student, students to a parent) without listing everyone:
// the people already linked show as removable chips, and the rest are found by typing a name.
export default function AdminPeoplePicker({
  label,
  people,
  selectedIds,
  onToggle,
  noneSelectedLabel,
  searchPlaceholder,
}: {
  label: string
  people: Person[]
  selectedIds: string[]
  onToggle: (id: string) => void
  noneSelectedLabel: string
  searchPlaceholder: string
}) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const selected = selectedIds.flatMap(id => people.filter(person => person.id === id))
  const matches = query.trim()
    ? people.filter(person => !selectedIds.includes(person.id) && matchesSearch(query, person.name))
    : []

  const add = (id: string) => {
    onToggle(id)
    setQuery('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (matches.length > 0) add(matches[0].id)
    } else if (event.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {selected.length === 0 ? (
        <p className="mb-2 text-xs text-gray-400">{noneSelectedLabel}</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map(person => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-800 py-1 pl-3 pr-1 text-xs font-semibold text-white"
            >
              {person.name}
              <button
                type="button"
                onClick={() => onToggle(person.id)}
                aria-label={`Remove ${person.name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        placeholder={searchPlaceholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
      />
      {query.trim() && (
        <div className="mt-1 rounded-lg border border-gray-200 bg-white">
          {matches.slice(0, MAX_SUGGESTIONS).map(person => (
            <button
              key={person.id}
              type="button"
              onClick={() => add(person.id)}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              ＋ {person.name}
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-gray-400">No one else matches &ldquo;{query.trim()}&rdquo;.</p>
          )}
          {matches.length > MAX_SUGGESTIONS && (
            <p className="px-3 py-1.5 text-xs text-gray-400">{matches.length - MAX_SUGGESTIONS} more. Keep typing to narrow it down.</p>
          )}
        </div>
      )}
    </div>
  )
}
