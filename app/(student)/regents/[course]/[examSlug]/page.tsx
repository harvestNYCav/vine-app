import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getRegentsExamBySlug,
  getRegentsSectionQuestions,
  isRegentsCourse,
  REGENTS_COURSE_LABELS,
  regentsAdministrationLabel,
} from '@/content/regents'
import { REGENTS_STUDY_GUIDES } from '@/content/regents/lesson-copy'
import RegentsAttribution from '@/components/regents/RegentsAttribution'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentRegentsCourses } from '@/lib/regents-courses'
import { studentCanAccessRegentsExam } from '@/lib/regents-exam-access'
import { getStudentTracks } from '@/lib/tracks'

export default async function RegentsExamPage({ params }: { params: Promise<{ course: string; examSlug: string }> }) {
  const { course, examSlug } = await params
  if (!isRegentsCourse(course)) notFound()
  const exam = getRegentsExamBySlug(course, examSlug)
  if (!exam) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [assignedCourses, tracks] = await Promise.all([
    getStudentRegentsCourses(db, session.userId),
    getStudentTracks(db, session.userId),
  ])
  if (!studentCanAccessRegentsExam(tracks, assignedCourses, exam)) notFound()

  const subject = course === 'english' ? 'ela' : 'math'
  const table = subject === 'ela' ? 'ela_exam_section_progress' : 'math_exam_section_progress'
  const progressResult = await db.execute({
    sql: `SELECT section_slug, attempts, best_points, best_possible FROM ${table} WHERE user_id = ? AND exam_id = ?`,
    args: [session.userId, exam.id],
  })
  const progress = progressResult.rows
  const guide = REGENTS_STUDY_GUIDES[course]

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link href={`/regents/${course}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">← {REGENTS_COURSE_LABELS[course]} exams</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-700">Released Regents · {exam.standardsEra === 'NGLS' ? 'Next Generation' : 'Common Core'}</p>
      <h1 className="mt-1 text-2xl font-bold text-green-800">{regentsAdministrationLabel(exam)} {REGENTS_COURSE_LABELS[course]}</h1>
      <p className="mt-2 text-sm text-gray-600">Part 1 multiple-choice questions only. Written-response portions are not included; practice percentages are not official Regents exam scores.</p>
      {exam.excludedQuestions?.length ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {exam.excludedQuestions.length} released questions are omitted from practice because NYSED's scoring notices do not give them one uniquely correct choice.
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-5">
        <h2 className="font-bold text-green-900">{guide.heading}</h2>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-relaxed text-green-950">
          {guide.steps.map(step => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <h2 className="mt-7 font-bold text-gray-800">Learning sections</h2>
      <div className="mt-3 space-y-3">
        {exam.sections.map(section => {
          const ready = getRegentsSectionQuestions(exam, section).length
          const row = progress.find(item => item.section_slug === section.slug)
          const best = row && Number(row.best_possible) > 0
            ? Math.round(Number(row.best_points) / Number(row.best_possible) * 100)
            : null
          const card = (
            <div className={`rounded-2xl border p-4 shadow-sm ${ready ? 'border-blue-100 bg-white' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{section.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">{ready} of {section.questionIds.length} questions ready</p>
                  {section.intro && <p className="mt-2 text-sm leading-relaxed text-gray-600">{section.intro}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${best !== null ? 'bg-green-100 text-green-800' : ready ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                  {best !== null ? `${best}% best` : ready ? 'Practice →' : 'In review'}
                </span>
              </div>
            </div>
          )
          return ready
            ? <Link key={section.slug} href={`/regents/${course}/${exam.slug}/${section.slug}`} className="block">{card}</Link>
            : <div key={section.slug}>{card}</div>
        })}
      </div>

      <div className="mt-6"><RegentsAttribution exam={exam} /></div>
    </main>
  )
}
