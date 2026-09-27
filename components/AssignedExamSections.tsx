import type { Client } from '@libsql/client'
import Link from 'next/link'
import type { GradeLevel } from '@/lib/grade-levels'
import {
  getExamSectionResults,
  listExamAssignmentsSince,
  pendingExamAssignments,
  type ExamSubject,
} from '@/lib/exam-assignments'
import { describeExamSection, examSectionIsForGrade } from '@/lib/exam-sections'
import { todayString } from '@/lib/scheduling'

// Assignments older than this drop off the student's list even if never finished.
const ASSIGNMENT_WINDOW_DAYS = 14

// "Assigned by your tutor" list at the top of the student's exam lessons. Every section stays
// open either way; this just surfaces the ones a tutor picked that the student hasn't finished.
export default async function AssignedExamSections({
  db,
  studentId,
  subject,
  gradeLevel,
  readOnly,
  isSpanish = false,
}: {
  db: Client
  studentId: string
  subject: ExamSubject
  gradeLevel: GradeLevel | null
  readOnly: boolean
  isSpanish?: boolean
}) {
  const since = todayString(Date.now() - ASSIGNMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [assignments, results] = await Promise.all([
    listExamAssignmentsSince(db, studentId, since),
    getExamSectionResults(db, studentId),
  ])
  const pending = pendingExamAssignments(assignments.filter(item => item.subject === subject), results)
    .filter(assignment => examSectionIsForGrade(assignment, gradeLevel))
    .flatMap(assignment => {
      const info = describeExamSection(assignment)
      return info ? [info] : []
    })
  if (pending.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-bold text-gray-800">
        {readOnly ? 'Assigned by the tutor' : isSpanish ? 'Asignado por tu tutor' : 'Assigned by your tutor'}
      </h2>
      <div className="space-y-3">
        {pending.map(info => {
          const useSpanish = isSpanish && info.supportsSpanish
          const card = (
            <div className="flex items-center gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl">{info.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{useSpanish && info.titleEs ? info.titleEs : info.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{info.year} · {info.subjectLabel}</p>
              </div>
              <span className="rounded-full bg-amber-200 px-2 py-1 text-[11px] font-bold text-amber-800">
                {isSpanish ? 'Asignado' : 'Assigned'}
              </span>
            </div>
          )
          const key = `${info.subject}:${info.examId}:${info.sectionSlug}`
          return readOnly ? <div key={key}>{card}</div> : (
            <Link key={key} href={`${info.href}${useSpanish ? '?lang=es' : ''}`} className="block">{card}</Link>
          )
        })}
      </div>
    </section>
  )
}
