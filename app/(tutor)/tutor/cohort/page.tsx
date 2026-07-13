import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getModule } from '@/content/modules'
import Link from 'next/link'
import AttendanceToggle from './AttendanceToggle'

export default async function CohortPage() {
  await getSession()
  const db = await getDb()

  const [sessionsResult, studentsResult, attendanceResult, strugglingResult, allModuleProgressResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM sessions ORDER BY date ASC', args: [] }),
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'student' ORDER BY name", args: [] }),
    db.execute({ sql: 'SELECT * FROM attendance', args: [] }),
    db.execute({
      sql: `SELECT word_id, module_slug, user_id, correct_count, incorrect_count
            FROM vocab_progress
            WHERE incorrect_count > correct_count OR (correct_count < 2 AND repetitions > 1)
            ORDER BY incorrect_count DESC`,
      args: [],
    }),
    db.execute({ sql: 'SELECT * FROM module_progress', args: [] }),
  ])

  type SessionRow = { id: string; student_id: string; date: string; module_slug: string }
  type StudentRow = { id: string; name: string }
  type AttendanceRow = { session_date: string; student_id: string; present: number }
  type StrugglingRow = { word_id: string; module_slug: string; user_id: string; correct_count: number; incorrect_count: number }
  type ModProgressRow = { user_id: string; module_slug: string; homework_completed_at: number | null }

  const sessions = sessionsResult.rows as unknown as SessionRow[]
  const students = studentsResult.rows as unknown as StudentRow[]
  const attendanceRows = attendanceResult.rows as unknown as AttendanceRow[]
  const strugglingVocab = strugglingResult.rows as unknown as StrugglingRow[]
  const allModuleProgressRows = allModuleProgressResult.rows as unknown as ModProgressRow[]

  // Index attendance for fast lookup
  const attendanceMap = new Map<string, boolean>()
  for (const row of attendanceRows) {
    attendanceMap.set(`${row.session_date}:${row.student_id}`, Number(row.present) === 1)
  }

  // Each student can be on a different module on the same date, so index sessions
  // per (student, date) rather than assuming one shared module per date.
  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort()
  const sessionByStudentDate = new Map<string, SessionRow>()
  for (const s of sessions) {
    sessionByStudentDate.set(`${s.student_id}:${s.date}`, s)
  }

  // Index all module progress per student (including incomplete)
  const moduleProgressByStudent = new Map<string, Array<{ module_slug: string; homework_completed_at: number | null }>>()
  for (const row of allModuleProgressRows) {
    if (!moduleProgressByStudent.has(row.user_id)) moduleProgressByStudent.set(row.user_id, [])
    moduleProgressByStudent.get(row.user_id)!.push(row)
  }

  // Index completed modules per student (homework_completed_at set)
  const completedMap = new Map<string, Set<string>>()
  for (const row of allModuleProgressRows) {
    if (!row.homework_completed_at) continue
    if (!completedMap.has(row.user_id)) completedMap.set(row.user_id, new Set())
    completedMap.get(row.user_id)!.add(row.module_slug)
  }

  // Aggregate struggling words: word → set of student ids
  const wordStudentMap = new Map<string, { moduleSlug: string; wordId: string; students: Set<string> }>()
  for (const row of strugglingVocab) {
    const key = row.word_id
    if (!wordStudentMap.has(key)) {
      wordStudentMap.set(key, { moduleSlug: row.module_slug, wordId: row.word_id, students: new Set() })
    }
    wordStudentMap.get(key)!.students.add(row.user_id)
  }

  // Group struggling words by module, sorted by number of struggling students
  const strugglingByModule = new Map<string, Array<{ wordId: string; studentCount: number }>>()
  for (const [, entry] of wordStudentMap) {
    if (!strugglingByModule.has(entry.moduleSlug)) strugglingByModule.set(entry.moduleSlug, [])
    strugglingByModule.get(entry.moduleSlug)!.push({ wordId: entry.wordId, studentCount: entry.students.size })
  }
  for (const arr of strugglingByModule.values()) {
    arr.sort((a, b) => b.studentCount - a.studentCount)
  }

  const iconMap: Record<string, string> = {
    Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
    BookOpen: '📚', Pencil: '✏️',
    Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
    MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
    Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/tutor" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-amber-800">Cohort Overview</h1>
          <p className="text-gray-500 text-sm">{students.length} students · {sessions.length} student-sessions recorded</p>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Attendance</h2>
        {sessions.length === 0 ? (
          <div className="bg-amber-50 rounded-xl p-6 text-center text-sm text-amber-700">
            No sessions recorded yet —{' '}
            <Link href="/tutor/lessons" className="underline font-medium">assign a lesson from the Lesson Library</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-3 min-w-[100px]">Student</th>
                  {uniqueDates.map(date => (
                    <th key={date} className="text-center text-xs text-gray-500 font-medium pb-2 px-1 min-w-[56px]">
                      {date.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-t border-gray-100">
                    <td className="py-2 pr-3 text-gray-700 font-medium text-sm">{student.name}</td>
                    {uniqueDates.map(date => {
                      const s = sessionByStudentDate.get(`${student.id}:${date}`)
                      const mod = s ? getModule(s.module_slug) : null
                      const present = attendanceMap.get(`${date}:${student.id}`) ?? false
                      return (
                        <td key={date} className="py-2 px-1 text-center">
                          <div className="text-[10px] text-gray-400 mb-0.5 truncate max-w-[56px]">{mod?.titleEn.split(' ')[0] ?? '—'}</div>
                          <AttendanceToggle
                            sessionDate={date}
                            studentId={student.id}
                            initialPresent={present}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Module Completion */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Module Completion</h2>
        {students.length === 0 ? (
          <p className="text-sm text-gray-400">No students enrolled yet.</p>
        ) : (
          <div className="space-y-2">
            {students.map(student => {
              const completed = completedMap.get(student.id) ?? new Set()
              return (
                <div key={student.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-20 flex-shrink-0">{student.name}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {(moduleProgressByStudent.get(student.id) ?? []).map(r => {
                      const mod = getModule(r.module_slug)
                      if (!mod) return null
                      return (
                        <span
                          key={r.module_slug}
                          title={mod.titleEn}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${r.homework_completed_at ? 'bg-green-100' : 'bg-gray-100'}`}
                        >
                          {iconMap[mod.icon] ?? '📚'}
                        </span>
                      )
                    })}
                    {completed.size === 0 && (moduleProgressByStudent.get(student.id) ?? []).length === 0 && (
                      <span className="text-xs text-gray-400">No modules started yet</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Struggling Words */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Cohort Struggles</h2>
        {strugglingByModule.size === 0 ? (
          <p className="text-sm text-gray-400">No struggling patterns detected yet.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(strugglingByModule.entries()).map(([moduleSlug, words]) => {
              const mod = getModule(moduleSlug)
              return (
                <div key={moduleSlug}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {mod?.titleEn ?? moduleSlug}
                  </p>
                  <div className="space-y-1.5">
                    {words.slice(0, 8).map(({ wordId, studentCount }) => {
                      const rawId = wordId.includes(':') ? wordId.split(':')[1] : wordId
                      const vocab = mod?.vocab.find(v => v.id === rawId)
                      return (
                        <div key={wordId} className="bg-white rounded-lg p-2.5 border border-red-50 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-sm font-medium text-gray-800">{vocab?.en ?? rawId}</span>
                            {vocab && mod?.track === 'esl' && <span className="text-xs text-gray-400 ml-2">{vocab.es}</span>}
                          </div>
                          <span className="text-xs text-red-500 flex-shrink-0">
                            {studentCount} student{studentCount !== 1 ? 's' : ''} struggling
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
