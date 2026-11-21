import Link from 'next/link'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { getStudentTracks } from '@/lib/tracks'
import { getStudentTutorIds } from '@/lib/tutors'
import { getStudentSettings, studentSchoolGradeLevel } from '@/lib/student-settings'
import { getStudentRegentsCourses, REGENTS_COURSE_OPTIONS } from '@/lib/regents-courses'
import { listParentsForAdmin } from '@/lib/parents'
import { loadTutorPairingRecords, summarizeTutorPairings } from '@/lib/tutor-pairings'
import { listTutorSignupRequests } from '@/lib/tutor-approvals'
import type { Track } from '@/types'
import AdminStudentDirectory, { type AdminStudentSummary } from './AdminStudentDirectory'
import AdminAllowlistControls from './AdminAllowlistControls'
import AdminDangerZoneControls from './AdminDangerZoneControls'
import AdminCreateStudentForm from './AdminCreateStudentForm'
import AdminParentControls from './AdminParentControls'
import AdminPinResetControls from './AdminPinResetControls'
import AdminTutorApprovalControls from './AdminTutorApprovalControls'
import { getMathExamsForGrade } from '@/content/math-exams'
import { getElaExamsForGrade } from '@/content/ela-exams'
import { assignedRegentsSectionKeys } from '@/lib/regents-progress'
import { isPaused, pauseStateFromRow, type FlaggableRole } from '@/lib/account-visibility'
import { getShowTestAccounts } from '@/lib/account-visibility-server'
import { todayString } from '@/lib/scheduling'
import AdminTestAccountControls from './AdminTestAccountControls'
import ShowTestAccountsToggle from './ShowTestAccountsToggle'

function formatLastActive(value: number) {
  if (!value) return 'No activity yet'
  const days = Math.floor((Date.now() - value) / 86400000)
  if (days <= 0) return 'Active today'
  if (days === 1) return 'Active yesterday'
  return `${days} days ago`
}

export default async function AdminPage() {
  const db = await getDb()
  const today = todayString()
  const [accountsResult, adminAllowlistResult, allParents, pairingRecords, tutorSignupRequests, showTestAccounts] = await Promise.all([
    db.execute({
      sql: `SELECT id, name, role, last_active, is_test, paused_on, paused_until FROM users
            WHERE role IN ('student', 'tutor', 'parent') ORDER BY name`,
      args: [],
    }),
    db.execute({ sql: 'SELECT email, created_at FROM admin_email_allowlist ORDER BY created_at DESC', args: [] }),
    listParentsForAdmin(db),
    loadTutorPairingRecords(db),
    listTutorSignupRequests(db),
    getShowTestAccounts(),
  ])

  // Every student, tutor and parent. Test accounts are listed only when "Show test accounts" is on,
  // and never counted; paused students are listed (the directory folds them away) but not counted.
  const accounts = accountsResult.rows.map(row => {
    const pause = pauseStateFromRow(row)
    return {
      id: String(row.id),
      name: String(row.name),
      role: String(row.role) as FlaggableRole,
      last_active: Number(row.last_active),
      isTest: Number(row.is_test) === 1,
      paused: row.role === 'student' && isPaused(pause, today),
      pausedOn: pause.pausedOn,
      pausedUntil: pause.pausedUntil,
    }
  })
  const listed = accounts.filter(account => showTestAccounts || !account.isTest)
  const listedIds = new Set(listed.map(account => account.id))
  const students = listed.filter(account => account.role === 'student')
  const tutors = listed.filter(account => account.role === 'tutor').map(({ id, name }) => ({ id, name }))
  const parents = allParents.filter(parent => listedIds.has(parent.id))
  const testAccountCount = accounts.filter(account => account.isTest).length
  const adminAllowlist = adminAllowlistResult.rows.map(row => ({
    email: String(row.email),
    createdAt: Number(row.created_at),
  }))
  // Names of every tutor, test or not, so a student paired with a hidden one still says who.
  const tutorNameById = new Map(accounts.filter(account => account.role === 'tutor').map(tutor => [tutor.id, tutor.name]))
  const pairingsByStudent = summarizeTutorPairings(pairingRecords, tutorNameById)
  const resettableProfiles = [
    ...students.map(student => ({ id: student.id, name: student.name, role: 'student' as const })),
    ...tutors.map(tutor => ({ id: tutor.id, name: tutor.name, role: 'tutor' as const })),
    ...parents.map(parent => ({ id: parent.id, name: parent.name, role: 'parent' as const })),
  ]

  const studentData = await Promise.all(students.map(async student => {
    const [tracks, tutorIds, settings, regentsCourses, modulesResult, vocabResult, reviewedResult, mathResult, examProgressResult, elaExamProgressResult] = await Promise.all([
      getStudentTracks(db, student.id),
      getStudentTutorIds(db, student.id),
      getStudentSettings(db, student.id),
      getStudentRegentsCourses(db, student.id),
      db.execute({ sql: 'SELECT module_slug, homework_completed_at FROM module_progress WHERE user_id = ?', args: [student.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM vocab_progress WHERE user_id = ? AND correct_count >= 3', args: [student.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM module_progress WHERE user_id = ? AND vocab_viewed_at IS NOT NULL', args: [student.id] }),
      db.execute({ sql: 'SELECT total_problems, total_correct FROM math_progress WHERE user_id = ?', args: [student.id] }),
      db.execute({ sql: 'SELECT exam_id, section_slug FROM math_exam_section_progress WHERE user_id = ? AND completed_at IS NOT NULL', args: [student.id] }),
      db.execute({ sql: 'SELECT exam_id, section_slug FROM ela_exam_section_progress WHERE user_id = ? AND completed_at IS NOT NULL', args: [student.id] }),
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
      regentsCourses,
      completedLessons,
      totalLessons: chosenEnglishModules.length,
      vocabMastered: Number(vocabResult.rows[0]?.count ?? 0),
      reviewedModules: Number(reviewedResult.rows[0]?.count ?? 0),
      mathProblems,
      mathAccuracy: mathProblems ? Math.round(mathCorrect / mathProblems * 100) : 0,
      examSectionsCompleted: (() => {
        if (settings.highSchoolGradeLevel) {
          const assignedSectionKeys = assignedRegentsSectionKeys(
            regentsCourses, tracks, settings.highSchoolGradeLevel, 'math',
          )
          return examProgressResult.rows.filter(row =>
            assignedSectionKeys.has(`${String(row.exam_id)}:${String(row.section_slug)}`)
          ).length
        }
        const assignedExamIds = new Set(getMathExamsForGrade(settings.gradeLevel).map(exam => exam.id))
        return examProgressResult.rows.filter(row => assignedExamIds.has(String(row.exam_id))).length
      })(),
      elaExamSectionsCompleted: (() => {
        if (settings.highSchoolGradeLevel) {
          const assignedSectionKeys = assignedRegentsSectionKeys(
            regentsCourses, tracks, settings.highSchoolGradeLevel, 'ela',
          )
          return elaExamProgressResult.rows.filter(row =>
            assignedSectionKeys.has(`${String(row.exam_id)}:${String(row.section_slug)}`)
          ).length
        }
        const assignedSectionKeys = new Set(getElaExamsForGrade(settings.gradeLevel).flatMap(exam =>
          exam.sections.map(section => `${exam.id}:${section.slug}`)
        ))
        return elaExamProgressResult.rows.filter(row =>
          assignedSectionKeys.has(`${String(row.exam_id)}:${String(row.section_slug)}`)
        ).length
      })(),
    }
  }))

  // The tiles count real, active students and real tutors only.
  const countedStudents = studentData.filter(student => !student.isTest && !student.paused)
  const countedTutorCount = accounts.filter(account => account.role === 'tutor' && !account.isTest).length
  const pausedCount = accounts.filter(account => account.role === 'student' && !account.isTest && account.paused).length
  const trackCounts = countedStudents.reduce<Record<Track, number>>((acc, student) => {
    student.tracks.forEach(track => { acc[track]++ })
    return acc
  }, { ela: 0, esl: 0, math: 0 })

  // Plain, serializable rows for the client-side search and filters.
  const directoryStudents: AdminStudentSummary[] = studentData.map(student => ({
    id: student.id,
    name: student.name,
    lastActiveLabel: formatLastActive(student.last_active),
    tracks: student.tracks,
    tutorIds: student.tutorIds,
    tutorNames: student.tutorIds.map(id => tutorNameById.get(id) ?? 'Unknown'),
    gradeLevel: studentSchoolGradeLevel(student.settings),
    regentsCourses: student.regentsCourses,
    regentsCourseLabels: student.regentsCourses.map(course =>
      REGENTS_COURSE_OPTIONS.find(option => option.id === course)?.label ?? course,
    ),
    mathSpanishEnabled: student.settings.mathSpanishEnabled,
    completedLessons: student.completedLessons,
    totalLessons: student.totalLessons,
    vocabMastered: student.vocabMastered,
    reviewedModules: student.reviewedModules,
    mathProblems: student.mathProblems,
    mathAccuracy: student.mathAccuracy,
    examSectionsCompleted: student.examSectionsCompleted,
    elaExamSectionsCompleted: student.elaExamSectionsCompleted,
    pairings: pairingsByStudent.get(student.id) ?? [],
    isTest: student.isTest,
    paused: student.paused,
    pausedOn: student.pausedOn,
    pausedUntil: student.pausedUntil,
  }))

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Program overview</p>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShowTestAccountsToggle show={showTestAccounts} count={testAccountCount} />
          <a
            href="/vine-app/api/admin/session-metrics"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Download session data (CSV)
          </a>
          <Link
            href="/admin/metrics"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Impact →
          </Link>
          <Link
            href="/admin/check-ins"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Check-ins →
          </Link>
        </div>
      </div>

      <AdminTutorApprovalControls requests={tutorSignupRequests} />
      <AdminCreateStudentForm />
      <AdminParentControls
        parents={parents}
        students={students.map(student => ({ id: student.id, name: student.name }))}
      />
      <AdminAllowlistControls initialEmails={adminAllowlist} />
      <AdminPinResetControls profiles={resettableProfiles} />
      <AdminTestAccountControls
        accounts={accounts.map(({ id, name, role, isTest }) => ({ id, name, role, isTest }))}
      />
      <AdminDangerZoneControls profiles={resettableProfiles} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{countedStudents.length}</p>
          <p className="text-sm text-slate-500">
            Students{pausedCount > 0 ? ` · ${pausedCount} paused` : ''}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{countedTutorCount}</p>
          <p className="text-sm text-slate-500">Tutors</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-900">ELA {trackCounts.ela}</p>
          <p className="text-sm font-semibold text-slate-900">ESL {trackCounts.esl}</p>
          <p className="text-sm font-semibold text-slate-900">Math {trackCounts.math}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-900">{countedStudents.filter(s => s.tutorIds.length > 0).length}</p>
          <p className="text-sm text-slate-500">Assigned</p>
        </div>
      </div>

      <AdminStudentDirectory students={directoryStudents} tutors={tutors} today={today} />
    </main>
  )
}
