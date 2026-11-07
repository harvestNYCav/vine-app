import {
  getRegentsExamsForCourse,
  getRegentsSectionQuestions,
  regentsAdministrationLabel,
  REGENTS_COURSE_LABELS,
} from '@/content/regents'
import type { RegentsCourse, RegentsExam, RegentsSection } from '@/content/regents/types'
import { examSectionKey } from '@/lib/exam-assignments'
import { regentsCourseSubject } from '@/lib/regents-courses'
import ExamAssignButton from './ExamAssignButton'

// Each course has dozens of past exams; list the newest few and fold the rest away.
const RECENT_EXAM_COUNT = 4

type ProgressRow = { exam_id: string; section_slug: string; attempts: number; best_points: number; best_possible: number }

function percentOf(row: ProgressRow | undefined) {
  return row?.best_possible ? Math.round(Number(row.best_points) / Number(row.best_possible) * 100) : 0
}

// The Regents sections a tutor can assign to a high school student, by course and exam. Each exam
// opens to its sections; one with a section assigned today starts open.
export default function RegentsSectionList({
  studentId,
  courses,
  subject,
  progress,
  assignedTodayKeys,
}: {
  studentId: string
  courses: RegentsCourse[]
  subject: 'math' | 'ela'
  progress: ProgressRow[]
  assignedTodayKeys: ReadonlySet<string>
}) {
  const selected = courses.filter(course => regentsCourseSubject(course) === subject)
  const progressFor = (exam: RegentsExam, section: RegentsSection) =>
    progress.find(row => row.exam_id === exam.id && row.section_slug === section.slug)
  const isAssigned = (exam: RegentsExam, section: RegentsSection) =>
    assignedTodayKeys.has(examSectionKey({ subject, examId: exam.id, sectionSlug: section.slug }))

  const renderExam = ({ exam, sections }: { exam: RegentsExam; sections: RegentsSection[] }) => {
    const practiced = sections.filter(section => Number(progressFor(exam, section)?.best_possible ?? 0) > 0).length
    const assignedCount = sections.filter(section => isAssigned(exam, section)).length
    return (
      <details key={exam.id} open={assignedCount > 0} className="group rounded-xl border border-gray-100 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs">
          <span className="text-gray-400 transition-transform group-open:rotate-90">▸</span>
          <span className="flex-1 font-semibold text-gray-700">{regentsAdministrationLabel(exam)}</span>
          {assignedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{assignedCount} assigned today</span>
          )}
          <span className="text-gray-400">{practiced}/{sections.length} practiced</span>
        </summary>
        <div className="divide-y divide-gray-50 border-t border-gray-50 px-3">
          {sections.map(section => {
            const row = progressFor(exam, section)
            const percentage = percentOf(row)
            return (
              <div key={section.slug} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700">{section.title}</p>
                  {row && (
                    <p className="text-[11px] text-gray-400">
                      {Number(row.attempts)} {Number(row.attempts) === 1 ? 'attempt' : 'attempts'}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold ${percentage ? 'text-blue-700' : 'text-gray-300'}`}>{percentage}%</span>
                <ExamAssignButton
                  studentId={studentId}
                  subject={subject}
                  examId={exam.id}
                  sectionSlug={section.slug}
                  assigned={isAssigned(exam, section)}
                />
              </div>
            )
          })}
        </div>
      </details>
    )
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Regents exam practice</p>
      <p className="mb-2 mt-1 text-[11px] leading-relaxed text-gray-400">
        Released multiple-choice sections, newest first. Assign one for today&apos;s session.
      </p>
      {selected.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          An admin needs to assign a {subject === 'ela' ? 'Regents English' : 'Regents Math'} course first.
        </div>
      ) : (
        <div className="space-y-4">
          {selected.map(course => {
            const exams = getRegentsExamsForCourse(course)
              .map(exam => ({ exam, sections: exam.sections.filter(section => getRegentsSectionQuestions(exam, section).length > 0) }))
              .filter(({ sections }) => sections.length > 0)
            const recent = exams.slice(0, RECENT_EXAM_COUNT)
            const older = exams.slice(RECENT_EXAM_COUNT)
            return (
              <div key={course}>
                <p className="mb-2 text-sm font-semibold text-gray-700">{course === 'english' ? '📖' : '📐'} {REGENTS_COURSE_LABELS[course]}</p>
                <div className="space-y-2">
                  {recent.map(renderExam)}
                  {older.length > 0 && (
                    <details open={older.some(({ exam, sections }) => sections.some(section => isAssigned(exam, section)))}>
                      <summary className="cursor-pointer list-none py-1 text-center text-xs font-medium text-amber-700 hover:text-amber-800">
                        Show {older.length} older exams
                      </summary>
                      <div className="mt-2 space-y-2">{older.map(renderExam)}</div>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
