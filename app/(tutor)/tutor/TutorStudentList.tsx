'use client'

import { Fragment, ReactNode, useState } from 'react'
import { matchesSearch, SEARCHABLE_LIST_SIZE } from '@/lib/search'

// The dashboard's student cards, with a search box once the roster is long. The leaderboard sits
// between the box and the cards, so it is hidden while searching to put the matches right under it.
export default function TutorStudentList({
  students,
  leaderboard,
}: {
  students: Array<{ id: string; name: string; card: ReactNode }>
  leaderboard: ReactNode
}) {
  const [query, setQuery] = useState('')
  const searchable = students.length > SEARCHABLE_LIST_SIZE
  const searching = searchable && query.trim() !== ''
  const visibleStudents = searching ? students.filter(student => matchesSearch(query, student.name)) : students

  return (
    <>
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          autoComplete="off"
          aria-label="Find a student"
          placeholder="Find a student"
          className="mb-6 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500"
        />
      )}
      {!searching && leaderboard}
      <div className="space-y-3">
        {visibleStudents.map(student => <Fragment key={student.id}>{student.card}</Fragment>)}
        {visibleStudents.length === 0 && searching && (
          <p className="py-6 text-center text-sm text-gray-400">No students match &ldquo;{query.trim()}&rdquo;.</p>
        )}
      </div>
    </>
  )
}
