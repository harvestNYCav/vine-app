import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getElaExamBySlug } from '@/content/ela-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { studentCanAccessElaExam } from '@/lib/ela-exam-access'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import NYSEDAttribution from '../../NYSEDAttribution'
import OfficialPassageLinks from '../../OfficialPassageLinks'

export default async function ElaExamSectionPage({
  params,
}: {
  params: Promise<{ examSlug: string; sectionSlug: string }>
}) {
  const { examSlug, sectionSlug } = await params
  const exam = getElaExamBySlug(examSlug)
  const section = exam?.sections.find(item => item.slug === sectionSlug)
  if (!exam || !section || section.passageReferences.length === 0) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [tracks, settings, progressResult] = await Promise.all([
    getStudentTracks(db, session.userId),
    getStudentSettings(db, session.userId),
    db.execute({
      sql: `
        SELECT * FROM ela_exam_section_progress
        WHERE user_id = ? AND exam_id = ? AND section_slug = ?
      `,
      args: [session.userId, exam.id, section.slug],
    }),
  ])
  if (!studentCanAccessElaExam(tracks, settings, exam)) notFound()

  const progress = progressResult.rows[0]
  const bestPercentage = progress && Number(progress.best_possible)
    ? Math.round(Number(progress.best_points) / Number(progress.best_possible) * 100)
    : null

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start gap-3">
        <Link
          href={`/ela/exams/${exam.slug}`}
          className="pt-1 text-2xl text-gray-400 hover:text-gray-600"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">Back to exam sections</span>
        </Link>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {section.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-green-800">{section.title}</h1>
          <p className="text-sm text-gray-500">
            New York Grade {exam.grade} ELA · {exam.year}
          </p>
        </div>
      </div>

      {bestPercentage !== null && (
        <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-800">Best practice score</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              {bestPercentage}%
            </span>
          </div>
          <p className="mt-1 text-xs text-green-700">
            {Number(progress.attempts)}{' '}
            {Number(progress.attempts) === 1 ? 'completed attempt' : 'completed attempts'}
          </p>
          <p className="mt-1 text-xs text-green-700">
            Multiple-choice questions are graded automatically.
          </p>
        </div>
      )}

      <div className="mb-4">
        <OfficialPassageLinks references={section.passageReferences} />
      </div>

      <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">Big idea</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{section.overview}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">What you will learn</h2>
        <ul className="mt-3 space-y-2">
          {section.learningGoals.map((goal, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed text-gray-600">
              <span className="font-bold text-green-600" aria-hidden="true">✓</span>
              <span>{goal}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Reading strategy</p>
        <p className="mt-2 text-sm leading-relaxed text-blue-900">{section.strategy}</p>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">Worked example</h2>
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm font-medium leading-relaxed text-gray-700">
          {section.workedExample.prompt}
        </p>
        <ol className="mt-4 space-y-3">
          {section.workedExample.steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-gray-600">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">
          {section.workedExample.takeaway}
        </p>
      </section>

      <p className="mb-3 text-center text-xs leading-relaxed text-gray-500">
        Read the linked official passage before you begin. Practice shows only the question and choices.
      </p>
      <Link href={`/ela/exams/${exam.slug}/${section.slug}/practice`} className="block">
        <span className="block w-full rounded-2xl bg-green-700 py-4 text-center text-lg font-semibold text-white shadow transition-transform active:scale-95">
          Practice {section.questionIds.length} released questions →
        </span>
      </Link>

      <div className="mt-5">
        <NYSEDAttribution exam={exam} />
      </div>
    </div>
  )
}
