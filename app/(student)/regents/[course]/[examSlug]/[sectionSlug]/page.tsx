import Link from 'next/link'
import { notFound } from 'next/navigation'
import RegentsAttribution from '@/components/regents/RegentsAttribution'
import RegentsPassage from '@/components/regents/RegentsPassage'
import {
  getRegentsExamBySlug,
  getRegentsSection,
  getRegentsSectionQuestions,
  isRegentsCourse,
  REGENTS_COURSE_LABELS,
  regentsAdministrationLabel,
} from '@/content/regents'
import { REGENTS_STUDY_GUIDES } from '@/content/regents/lesson-copy'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentRegentsCourses } from '@/lib/regents-courses'
import { studentCanAccessRegentsExam } from '@/lib/regents-exam-access'
import { getStudentTracks } from '@/lib/tracks'

export default async function RegentsSectionPage({
  params,
}: {
  params: Promise<{ course: string; examSlug: string; sectionSlug: string }>
}) {
  const { course, examSlug, sectionSlug } = await params
  if (!isRegentsCourse(course)) notFound()
  const exam = getRegentsExamBySlug(course, examSlug)
  if (!exam) notFound()
  const section = getRegentsSection(exam, sectionSlug)
  if (!section) notFound()
  const readyQuestions = getRegentsSectionQuestions(exam, section)
  if (!readyQuestions.length) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [assignedCourses, tracks] = await Promise.all([
    getStudentRegentsCourses(db, session.userId),
    getStudentTracks(db, session.userId),
  ])
  if (!studentCanAccessRegentsExam(tracks, assignedCourses, exam)) notFound()

  const guide = REGENTS_STUDY_GUIDES[course]

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link href={`/regents/${course}/${exam.slug}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">← {regentsAdministrationLabel(exam)} {REGENTS_COURSE_LABELS[course]}</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-700">Learning section</p>
      <h1 className="mt-1 text-2xl font-bold text-green-800">{section.title}</h1>
      {section.intro && <p className="mt-2 text-sm leading-relaxed text-gray-600">{section.intro}</p>}
      <p className="mt-2 text-xs text-gray-500">{readyQuestions.length} reviewed multiple-choice questions available</p>

      <section className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-5">
        <h2 className="font-bold text-green-900">{guide.heading}</h2>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-relaxed text-green-950">
          {guide.steps.map(step => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-blue-900">Worked example</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-800">{guide.workedExample.prompt}</p>
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm leading-relaxed text-gray-700">
          {guide.workedExample.steps.map(step => <li key={step}>{step}</li>)}
        </ol>
        <p className="mt-3 text-sm font-semibold text-green-800">Answer: {guide.workedExample.answer}</p>
      </section>

      {section.passage && (
        <div className="mt-5"><RegentsPassage passage={section.passage} /></div>
      )}

      <Link
        href={`/regents/${course}/${exam.slug}/${section.slug}/practice`}
        className="mt-6 block rounded-2xl bg-green-700 px-5 py-4 text-center font-semibold text-white shadow-sm hover:bg-green-800"
      >
        Practice these questions →
      </Link>
      <p className="mt-3 text-center text-xs text-gray-500">Your answer is checked after each question, with an explanation.</p>
      <div className="mt-6"><RegentsAttribution exam={exam} /></div>
    </main>
  )
}
