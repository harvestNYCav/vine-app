'use client'

import { useMemo, useState } from 'react'
import { ESL_LEVELS } from '@/content/esl-placement'
import type { StudentProgress } from '@/lib/admin-metrics'
import { matchesSearch } from '@/lib/search'
import { count, flagClass, formatDay, maybe, percent } from './format'
import { studentFlags } from './flags'

type View = 'flagged' | 'active' | 'all'
type Row = { student: StudentProgress; flags: string[] }
type SortKey = 'name' | 'level' | 'lessons' | 'quiz' | 'homework' | 'practice' | 'words' | 'lastSeen' | 'flags'
type Direction = 'asc' | 'desc'
type Sort = { key: SortKey; direction: Direction }

// Students with a lesson or any practice in the focus.
const isActive = (student: StudentProgress) => student.lessonsAttended > 0 || student.activeDays > 0

// The levels arrive as labels; sort them by their place in the placement scale, not alphabetically.
const levelRank = new Map(ESL_LEVELS.map((level, index) => [level.label, index]))

interface Column {
  key: SortKey
  label: string
  className: string
  numeric?: boolean
  // What a row sorts on. Null (no level, no quiz, no homework assigned) sorts last either way.
  value: (row: Row) => number | string | null
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Student', className: 'py-2 pr-3', value: row => row.student.name },
  {
    key: 'level',
    label: 'ESL level',
    className: 'px-2 py-2',
    value: row => (row.student.currentLevel === null ? null : levelRank.get(row.student.currentLevel) ?? null),
  },
  { key: 'lessons', label: 'Lessons', className: 'px-2 py-2', numeric: true, value: row => row.student.lessonsAttended },
  { key: 'quiz', label: 'Quiz avg', className: 'px-2 py-2', numeric: true, value: row => row.student.quizAverage },
  {
    key: 'homework',
    label: 'Homework',
    className: 'px-2 py-2',
    numeric: true,
    value: row => (row.student.homeworkAssigned ? row.student.homeworkDone / row.student.homeworkAssigned : null),
  },
  { key: 'practice', label: 'Home practice', className: 'px-2 py-2', numeric: true, value: row => row.student.homePracticeDays },
  { key: 'words', label: 'Words', className: 'px-2 py-2', numeric: true, value: row => row.student.wordsMastered },
  // "Never" sorts as the longest ago, so oldest-first starts with the students never seen.
  { key: 'lastSeen', label: 'Last seen', className: 'px-2 py-2', value: row => row.student.lastSeen ?? '' },
  { key: 'flags', label: 'Worth a look', className: 'py-2 pl-2', value: row => row.flags.length },
]

// Flagged first, then the busiest, then by name. The table opens in this order, and it breaks ties
// in whichever column is sorted.
const defaultOrder = (a: Row, b: Row) => b.flags.length - a.flags.length
  || b.student.lessonsAttended - a.student.lessonsAttended
  || b.student.activeDays - a.student.activeDays
  || a.student.name.localeCompare(b.student.name)

const DEFAULT_SORT: Sort = { key: 'flags', direction: 'desc' }

function sortRows(rows: Row[], sort: Sort): Row[] {
  const column = COLUMNS.find(c => c.key === sort.key) ?? COLUMNS[0]
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = column.value(a)
    const y = column.value(b)
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1
    } else {
      const diff = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : Number(x) - Number(y)
      if (diff !== 0) return sign * diff
    }
    return defaultOrder(a, b)
  })
}

// Starts on the students who matter for the session in focus; the full list and a search are a
// click away. Typing in the search looks through every student, whatever view is picked. Any column
// header sorts the table by that column; clicking it again reverses the order.
export default function StudentProgressTable({ students, singleWeek, scopeLabel }: {
  students: StudentProgress[]
  singleWeek: boolean
  scopeLabel: string
}) {
  const rows = useMemo(() => students.map(student => ({ student, flags: studentFlags(student, singleWeek) })), [students, singleWeek])
  const active = rows.filter(row => isActive(row.student))
  const flagged = rows.filter(row => row.flags.length > 0)
  const [view, setView] = useState<View>(active.length ? 'active' : 'all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)

  const searching = query.trim().length > 0
  const base = searching ? rows : view === 'flagged' ? flagged : view === 'active' ? active : rows
  const shown = sortRows(
    base.filter(row => matchesSearch(query, [row.student.name, ...row.student.tutorNames, ...row.student.tracks])),
    sort,
  )

  // A new column starts A–Z for names and highest first for everything else.
  const sortBy = (key: SortKey) => setSort(current => current.key === key
    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: key === 'name' ? 'asc' : 'desc' })

  const views: Array<{ id: View; label: string; n: number }> = [
    { id: 'active', label: `Active ${scopeLabel}`, n: active.length },
    { id: 'flagged', label: 'Worth a look', n: flagged.length },
    { id: 'all', label: 'All students', n: rows.length },
  ]

  if (students.length === 0) return <p className="text-sm text-slate-500">No students yet.</p>
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-white p-1" role="tablist" aria-label="Which students">
          {views.map(option => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={!searching && view === option.id}
              onClick={() => { setView(option.id); setQuery('') }}
              className={`rounded-md px-3 py-1 text-sm font-semibold ${
                !searching && view === option.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label} <span className="font-normal opacity-75">({option.n})</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search all students, tutors or tracks"
          aria-label="Search students"
          className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
      </div>
      {searching && <p className="mb-2 text-xs text-slate-500">Searching all {rows.length} students: {shown.length} found.</p>}
      {shown.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          {searching ? 'No students match.' : view === 'flagged' ? 'Nobody is flagged.' : 'No students in this view.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                {COLUMNS.map(column => {
                  const sorted = sort.key === column.key
                  // Shows the current order, or on hover the order a click would give.
                  const arrowUp = sorted ? sort.direction === 'asc' : column.key === 'name'
                  const arrow = (
                    <span aria-hidden="true" className={sorted ? 'text-slate-700' : 'opacity-0 group-hover:opacity-50'}>
                      {arrowUp ? '▲' : '▼'}
                    </span>
                  )
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={sorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`${column.className} font-semibold ${column.numeric ? 'text-right' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => sortBy(column.key)}
                        className={`group inline-flex items-center gap-1 font-semibold hover:text-slate-800 ${sorted ? 'text-slate-800' : ''}`}
                      >
                        {column.numeric && arrow}
                        {column.label}
                        {!column.numeric && arrow}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map(({ student, flags }) => (
                <tr key={student.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-800">
                      {student.name}
                      {student.paused && (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800" title="Paused now; listed because they took part in this period">
                          Paused
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {student.tracks.length ? student.tracks.map(track => track.toUpperCase()).join(' · ') : 'No tracks'}
                      {student.tutorNames.length > 0 && ` · ${student.tutorNames.join(', ')}`}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {student.currentLevel === null ? (
                      <span className="text-slate-400">—</span>
                    ) : student.placements > 1 ? (
                      <span>
                        {student.firstLevel} → <span className="font-semibold">{student.currentLevel}</span>
                        {student.movedUp && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${flagClass('good')}`}>▲ Moved up</span>}
                      </span>
                    ) : (
                      <span>{student.currentLevel} <span className="text-xs text-slate-400">(not re-tested)</span></span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(student.lessonsAttended)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{maybe(student.quizAverage, percent)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                    {student.homeworkAssigned ? `${student.homeworkDone}/${student.homeworkAssigned}` : '—'}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                    {student.homePracticeDays ? `${student.homePracticeDays} ${student.homePracticeDays === 1 ? 'day' : 'days'}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(student.wordsMastered)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                    {student.lastSeen ? formatDay(student.lastSeen) : 'Never'}
                  </td>
                  <td className="py-2 pl-2">
                    <div className="flex flex-wrap gap-1">
                      {flags.map(flag => (
                        <span key={flag} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass('warn')}`}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
