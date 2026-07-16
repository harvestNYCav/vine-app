import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getElaExamBySlug } from '@/content/ela-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { studentCanAccessElaExam } from '@/lib/ela-exam-access'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import NYSEDAttribution from '../NYSEDAttribution'
import { formatPdfPageRange } from '../OfficialPassageLinks'

type ProgressRow = {
  section_slug: string
  attempts: number
  best_points: number
  best_possible: number
  completed_at: number | null
}

export default async function ElaExamPage({
  params,
}: {
  params: Promise<{ examSlug: string }>
}) {
  const { examSlug } = await params
  const exam = getElaExamBySlug(examSlug)
  if (!exam || exam.sections.some(section => section.passageReferences.length === 0)) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [tracks, settings, progressResult] = await Promise.all([
    getStudentTracks(db, session.userId),
    getStudentSettings(db, session.userId),
    db.execute({
      sql: 'SELECT * FROM ela_exam_section_progress WHERE user_id = ? AND exam_id = ?',
      args: [session.userId, exam.id],
    }),
  ])
  if (!studentCanAccessElaExam(tracks, settings, exam)) notFound()

  const currentSectionSlugs = new Set(exam.sections.map(section => section.slug))
  const progress = (progressResult.rows as unknown as ProgressRow[])
    .filter(item => currentSectionSlugs.has(item.section_slug))
  const completedCount = progress.filter(item => item.completed_at).length
  const progressPercentage = exam.sections.length
    ? completedCount / exam.sections.length * 100
    : 0

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start gap-3">
        <Link href="/modules?mode=ela" className="pt-1 text-2xl text-gray-400 hover:text-gray-600">
          <span aria-hidden="true">←</span>
          <span className="sr-only">Back to ELA lessons</span>
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            New York released ELA practice
          </p>
          <h1 className="mt-1 text-2xl font-bold text-green-800">{exam.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{exam.description}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-green-800">Course progress</span>
          <span className="text-sm font-bold text-green-700">
            {completedCount}/{exam.sections.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-200">
          <div
            className="h-full rounded-full bg-green-600"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900">Use the official booklet with Vine</p>
        <p className="mt-1 text-sm leading-relaxed text-blue-900">
          Each section links to the exact PDF pages for its passage. Read the passage in the official
          booklet first, then return here for the multiple-choice questions. Vine displays only each
          question and its answer choices.
        </p>
        <a
          href={exam.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-800 underline decoration-blue-300 underline-offset-2 shadow-sm"
        >
          Open the complete official booklet <span className="ml-1" aria-hidden="true">↗</span>
        </a>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        Every Vine question in this collection is multiple choice and graded automatically.
      </p>

      <div className="space-y-3">
        {exam.sections.map(section => {
          const sectionProgress = progress.find(item => item.section_slug === section.slug)
          const bestPercentage = sectionProgress?.best_possible
            ? Math.round(Number(sectionProgress.best_points) / Number(sectionProgress.best_possible) * 100)
            : null

          return (
            <Link
              key={section.slug}
              href={`/ela/exams/${exam.slug}/${section.slug}`}
              className="block"
            >
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {section.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">{section.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {section.questionIds.length} released questions · {section.passageLabel}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-blue-700">
                      {section.passageReferences.map(formatPdfPageRange).join(' · ')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {bestPercentage === null ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                        Start →
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          {bestPercentage}%
                        </span>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {Number(sectionProgress!.attempts)}{' '}
                          {Number(sectionProgress!.attempts) === 1 ? 'attempt' : 'attempts'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-6">
        <NYSEDAttribution exam={exam} />
      </div>
    </div>
  )
}
