import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import Link from 'next/link'
import { ALL_MODULES } from '@/content/modules'
import { filterTutorRosterStudents, getTutorStudentIds } from '@/lib/tutor-roster'
import { getTutorRosterScope } from '@/lib/tutor-roster-server'
import { getStudentTracks } from '@/lib/tracks'
import { summarizeLessonProgressForTracks } from '@/lib/lesson-progress'
import { formatWordCount } from '@/lib/study'

const LB_TYPES = [
  { key: 'practice_5', label: '5 min', isTimed: true },
  { key: 'practice_10', label: '10 min', isTimed: true },
  { key: 'flat_10', label: '10 Q', isTimed: false },
  { key: 'flat_25', label: '25 Q', isTimed: false },
] as const

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default async function TutorDashboardPage() {
  const session = await getSession()
  const db = await getDb()

  const [studentsResult, assignedStudentIds, rosterScope] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM users WHERE role = 'student' ORDER BY last_active DESC",
      args: [],
    }),
    getTutorStudentIds(db, session!.userId),
    getTutorRosterScope(session!.userId),
  ])
  type StudentRow = { id: string; name: string; last_active: number }
  const allStudents = studentsResult.rows as unknown as StudentRow[]
  const students = filterTutorRosterStudents(allStudents, assignedStudentIds, rosterScope)

  const studentData = await Promise.all(students.map(async student => {
    const [tracks, moduleProgressResult, vm, la] = await Promise.all([
      getStudentTracks(db, student.id),
      db.execute({ sql: 'SELECT module_slug, vocab_viewed_at, homework_completed_at FROM module_progress WHERE user_id = ?', args: [student.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM vocab_progress WHERE user_id = ? AND correct_count >= 3', args: [student.id] }),
      db.execute({ sql: 'SELECT date FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 1', args: [student.id] }),
    ])
    type ModuleProgressRow = { module_slug: string; vocab_viewed_at: number | null; homework_completed_at: number | null }
    const lessonProgress = summarizeLessonProgressForTracks(
      ALL_MODULES,
      tracks,
      moduleProgressResult.rows as unknown as ModuleProgressRow[],
    )
    const vocabMastered = vm.rows[0] as unknown as { count: number }
    const lastActivity = la.rows[0] as unknown as { date: string } | undefined
    const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity.date).getTime()) / 86400000) : null

    return {
      ...student,
      completedModules: lessonProgress.completedLessons,
      totalModules: lessonProgress.totalLessons,
      vocabMastered: Number(vocabMastered.count),
      reviewedModules: lessonProgress.reviewedLessons,
      daysSince,
      lastActivityDate: lastActivity?.date,
    }
  }))

  const leaderboards = (await Promise.all(LB_TYPES.map(async ({ key, label, isTimed }) => {
    const assignedOnlySql = rosterScope === 'assigned'
      ? `AND EXISTS (
          SELECT 1 FROM student_tutors st
          WHERE st.student_id = ms.user_id AND st.tutor_id = ?
        )`
      : ''
    const args = rosterScope === 'assigned' ? [key, session!.userId] : [key]
    const result = isTimed
      ? await db.execute({
          sql: `SELECT ms.user_id, u.name, ms.correct, ms.accuracy, ms.total_problems
                FROM math_sessions ms JOIN users u ON u.id = ms.user_id
                WHERE ms.session_type = ?
                ${assignedOnlySql}
                ORDER BY ms.correct DESC, ms.accuracy DESC LIMIT 5`,
          args,
        })
      : await db.execute({
          sql: `SELECT ms.user_id, u.name, ms.correct, ms.total_problems, ms.accuracy,
                       (ms.ended_at - ms.started_at) as duration_ms
                FROM math_sessions ms JOIN users u ON u.id = ms.user_id
                WHERE ms.session_type = ? AND ms.ended_at > ms.started_at
                ${assignedOnlySql}
                ORDER BY ms.correct DESC, (ms.ended_at - ms.started_at) ASC LIMIT 5`,
          args,
        })
    return { key, label, isTimed, rows: result.rows }
  }))).filter(lb => lb.rows.length > 0)

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <h1 className="text-2xl font-bold text-amber-800 mb-1">
        {rosterScope === 'assigned' ? 'My Students' : 'All Students'}
      </h1>
      <p className="text-gray-500 text-sm mb-2">
        {rosterScope === 'assigned'
          ? `${students.length} assigned to you · ${allStudents.length} in program`
          : `${allStudents.length} in program`}
      </p>
      <Link href="/tutor/cohort" className="text-amber-700 text-sm underline block mb-6">View cohort overview →</Link>

      {students.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p>
            {allStudents.length === 0
              ? 'No students yet. An admin can create the first student account.'
              : 'No students are assigned to you. Use All students above for substitute coverage.'}
          </p>
        </div>
      )}

      {/* Math Leaderboard */}
      {leaderboards.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-gray-700 mb-3">➕ Math Leaderboard</h2>
          <div className="space-y-4">
            {leaderboards.map(lb => (
              <div key={lb.key} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-600 mb-3">{lb.label}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-gray-400 font-semibold pb-1.5 w-6">#</th>
                      <th className="text-left text-xs text-gray-400 font-semibold pb-1.5">Student</th>
                      <th className="text-right text-xs text-gray-400 font-semibold pb-1.5">
                        {lb.isTimed ? 'Score' : 'Time'}
                      </th>
                      <th className="text-right text-xs text-gray-400 font-semibold pb-1.5">Acc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lb.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-400 font-bold text-xs">{i + 1}</td>
                        <td className="py-1.5 text-gray-700">{row.name as string}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-700">
                          {lb.isTimed ? String(row.correct) : fmtTime(Number(row.duration_ms))}
                        </td>
                        <td className="py-1.5 text-right text-gray-500 text-xs">{Number(row.accuracy)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {studentData.map(student => (
          <Link key={student.id} href={`/tutor/${student.id}`}>
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
    </div>
  )
}
