import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getRegentsExamReadyCount,
  getRegentsExamsForCourse,
  isRegentsCourse,
  REGENTS_COURSE_LABELS,
  regentsAdministrationLabel,
} from '@/content/regents'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentRegentsCourses } from '@/lib/regents-courses'
import { getStudentTracks } from '@/lib/tracks'

export default async function RegentsCoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params
  if (!isRegentsCourse(course)) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [assignedCourses, tracks] = await Promise.all([
    getStudentRegentsCourses(db, session.userId),
    getStudentTracks(db, session.userId),
  ])
  const subject = course === 'english' ? 'ela' : 'math'
  if (!assignedCourses.includes(course) || !tracks.includes(subject)) notFound()

  const exams = getRegentsExamsForCourse(course)
  const totalReady = exams.reduce((sum, exam) => sum + getRegentsExamReadyCount(exam), 0)
  const years = [...new Set(exams.map(exam => exam.year))]
  const progressTable = subject === 'ela' ? 'ela_exam_section_progress' : 'math_exam_section_progress'
  const progressResult = await db.execute({
    sql: `SELECT exam_id, section_slug, best_points, best_possible FROM ${progressTable} WHERE user_id = ?`,
    args: [session.userId],
  })
  const progress = progressResult.rows

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link href={`/modules?mode=${subject}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">← Back to lessons</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-700">New York Regents · Multiple choice</p>
      <h1 className="mt-1 text-2xl font-bold text-green-800">{REGENTS_COURSE_LABELS[course]}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {exams.length} released exam administrations are indexed here. Each exam is organized into short practice sections.
        {totalReady < exams.reduce((sum, exam) => sum + exam.questions.length, 0)
          ? ' Questions still undergoing text, accessibility, and explanation review are shown as pending and cannot be practiced yet.'
          : ''}
      </p>

      <div className="mt-6 space-y-3">
        {years.map((year, yearIndex) => (
          <details key={year} open={yearIndex === 0} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-800">{year}</summary>
            <div className="space-y-2 border-t border-gray-100 p-3">
              {exams.filter(exam => exam.year === year).map(exam => {
                const readyCount = getRegentsExamReadyCount(exam)
                const attempts = progress.filter(row => row.exam_id === exam.id && Number(row.best_possible) > 0).length
                const card = (
                  <div className={`rounded-xl border p-4 ${readyCount ? 'border-blue-100 bg-blue-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-gray-800">{regentsAdministrationLabel(exam)}</h2>
                        <p className="mt-1 text-xs text-gray-600">
                          {readyCount} of {exam.questions.length} questions ready · {exam.standardsEra === 'NGLS' ? 'Next Generation' : 'Common Core'}
                        </p>
                        {attempts > 0 && <p className="mt-1 text-xs text-green-700">{attempts} practice sections completed</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${readyCount ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {readyCount ? 'Open →' : 'In review'}
                      </span>
                    </div>
                  </div>
                )
                return readyCount
                  ? <Link key={exam.id} href={`/regents/${course}/${exam.slug}`} className="block">{card}</Link>
                  : <div key={exam.id}>{card}</div>
              })}
            </div>
          </details>
        ))}
      </div>
    </main>
  )
}
