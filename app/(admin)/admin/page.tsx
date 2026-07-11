import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { getStudentTracks } from '@/lib/tracks'
import { getStudentTutorIds } from '@/lib/tutors'
import { getStudentSettings } from '@/lib/student-settings'
import type { Track } from '@/types'
import AdminStudentControls from './AdminStudentControls'
import AdminAllowlistControls from './AdminAllowlistControls'
import AdminDangerZoneControls from './AdminDangerZoneControls'

function formatLastActive(value: number) {
  if (!value) return 'No activity yet'
  const days = Math.floor((Date.now() - value) / 86400000)
  if (days <= 0) return 'Active today'
  if (days === 1) return 'Active yesterday'
  return `${days} days ago`
}

export default async function AdminPage() {
  const db = await getDb()
  const [studentsResult, tutorsResult, adminAllowlistResult] = await Promise.all([
    db.execute({ sql: "SELECT id, name, last_active FROM users WHERE role = 'student' ORDER BY name", args: [] }),
    db.execute({ sql: "SELECT id, name FROM users WHERE role = 'tutor' ORDER BY name", args: [] }),
    db.execute({ sql: 'SELECT email, created_at FROM admin_email_allowlist ORDER BY created_at DESC', args: [] }),
  ])

  type StudentRow = { id: string; name: string; last_active: number }
  type TutorRow = { id: string; name: string }
  const students: StudentRow[] = studentsResult.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    last_active: Number(row.last_active),
  }))
  const tutors: TutorRow[] = tutorsResult.rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
  }))
  const adminAllowlist = adminAllowlistResult.rows.map(row => ({
    email: String(row.email),
    createdAt: Number(row.created_at),
  }))
  const tutorNameById = new Map(tutors.map(tutor => [tutor.id, tutor.name]))
  const resettableProfiles = [
    ...students.map(student => ({ id: student.id, name: student.name, role: 'student' as const })),
    ...tutors.map(tutor => ({ id: tutor.id, name: tutor.name, role: 'tutor' as const })),
  ]

  const studentData = await Promise.all(students.map(async student => {
    const [tracks, tutorIds, settings, modulesResult, vocabResult, reviewedResult, mathResult] = await Promise.all([
      getStudentTracks(db, student.id),
      getStudentTutorIds(db, student.id),
      getStudentSettings(db, student.id),
      db.execute({ sql: 'SELECT module_slug, homework_completed_at FROM module_progress WHERE user_id = ?', args: [student.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM vocab_progress WHERE user_id = ? AND correct_count >= 3', args: [student.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM module_progress WHERE user_id = ? AND vocab_viewed_at IS NOT NULL', args: [student.id] }),
      db.execute({ sql: 'SELECT total_problems, total_correct FROM math_progress WHERE user_id = ?', args: [student.id] }),
    ])
    type ModuleProgressRow = { module_slug: string; homework_completed_at: number | null }
    const moduleRows = modulesResult.rows as unknown as ModuleProgressRow[]
    const chosenEnglishModules = ALL_MODULES.filter(mod => tracks.includes(mod.track))
    const chosenSlugs = new Set(chosenEnglishModules.map(mod => mod.slug))
    const completedLessons = moduleRows.filter(row => row.homework_completed_at && chosenSlugs.has(row.module_slug)).length
    const mathRow = mathResult.rows[0] as unknown as { total_problems: number; total_correct: number } | undefined
    const mathProblems = mathRow ? Number(mathRow.total_problems) : 0
    const mathCorrect = mathRow ? Number(mathRow.total_correct) : 0

    return {
      ...student,
      tracks,
      tutorIds,
      settings,
      completedLessons,
      totalLessons: chosenEnglishModules.length,
      vocabMastered: Number(vocabResult.rows[0]?.count ?? 0),
      reviewedModules: Number(reviewedResult.rows[0]?.count ?? 0),
      mathProblems,
      mathAccuracy: mathProblems ? Math.round(mathCorrect / mathProblems * 100) : 0,
    }
  }))

  const trackCounts = studentData.reduce<Record<Track, number>>((acc, student) => {
    student.tracks.forEach(track => { acc[track]++ })
    return acc
  }, { ela: 0, esl: 0, math: 0 })

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-sm text-slate-500">Program overview</p>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
      </div>

      <AdminAllowlistControls initialEmails={adminAllowlist} />
      <AdminDangerZoneControls profiles={resettableProfiles} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{students.length}</p>
          <p className="text-sm text-slate-500">Students</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{tutors.length}</p>
          <p className="text-sm text-slate-500">Tutors</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-900">ELA {trackCounts.ela}</p>
          <p className="text-sm font-semibold text-slate-900">ESL {trackCounts.esl}</p>
          <p className="text-sm font-semibold text-slate-900">Math {trackCounts.math}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{studentData.filter(s => s.tutorIds.length > 0).length}</p>
          <p className="text-sm text-slate-500">Assigned</p>
        </div>
      </div>

      <div className="space-y-4">
        {studentData.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-500">
            No students yet.
          </div>
        )}

        {studentData.map(student => (
          <section key={student.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="grid lg:grid-cols-[1fr_280px] gap-5">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{student.name}</h2>
                    <p className="text-sm text-slate-500">
                      {formatLastActive(Number(student.last_active))} · Tutors: {
                        student.tutorIds.length > 0
                          ? student.tutorIds.map(id => tutorNameById.get(id) ?? 'Unknown').join(', ')
                          : 'Unassigned'
                      }
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {student.tracks.length === 0 ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">Needs tracks</span>
                    ) : student.tracks.map(track => (
                      <span key={track} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-semibold">{track.toUpperCase()}</span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-green-700">{student.completedLessons}/{student.totalLessons}</p>
                    <p className="text-xs text-slate-500">English lessons</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-blue-700">{student.vocabMastered}</p>
                    <p className="text-xs text-slate-500">Words mastered</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-purple-700">{student.reviewedModules}</p>
                    <p className="text-xs text-slate-500">Lessons reviewed</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-amber-700">{student.mathProblems}</p>
                    <p className="text-xs text-slate-500">Math problems · {student.mathAccuracy}%</p>
                  </div>
                </div>
              </div>

              <AdminStudentControls
                studentId={student.id}
                initialTutorIds={student.tutorIds}
                initialTracks={student.tracks}
                initialMathSpanishEnabled={student.settings.mathSpanishEnabled}
                tutors={tutors}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
