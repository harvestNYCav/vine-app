import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getMathExamBySlug } from '@/content/math-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import LangToggle from '../../../LangToggle'
import NYSEDAttribution from '../NYSEDAttribution'

type ProgressRow = {
  section_slug: string
  attempts: number
  best_points: number
  best_possible: number
  completed_at: number | null
}

export default async function MathExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const [{ examSlug }, { lang }] = await Promise.all([params, searchParams])
  const exam = getMathExamBySlug(examSlug)
  if (!exam) notFound()

  const session = await getSession()
  const db = await getDb()
  const [tracks, settings, progressResult] = await Promise.all([
    getStudentTracks(db, session!.userId),
    getStudentSettings(db, session!.userId),
    db.execute({
      sql: 'SELECT * FROM math_exam_section_progress WHERE user_id = ? AND exam_id = ?',
      args: [session!.userId, exam.id],
    }),
  ])
  if (!tracks.includes('math')) notFound()

  const canUseSpanish = settings.mathSpanishEnabled
  const isSpanish = canUseSpanish && lang === 'es'
  const progress = progressResult.rows as unknown as ProgressRow[]
  const completedCount = progress.filter(item => item.completed_at).length

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start gap-3">
        <Link href={`/modules?mode=math${isSpanish ? '&lang=es' : ''}`} className="pt-1 text-2xl text-gray-400 hover:text-gray-600">
          <span aria-hidden="true">←</span>
          <span className="sr-only">{isSpanish ? 'Volver a lecciones' : 'Back to lessons'}</span>
        </Link>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {isSpanish ? 'Práctica oficial publicada' : 'Official released practice'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-green-800">
            {isSpanish ? exam.title.es : exam.title.en}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSpanish ? exam.description.es : exam.description.en}
          </p>
        </div>
        {canUseSpanish && (
          <Suspense>
            <LangToggle currentLang={isSpanish ? 'es' : 'en'} />
          </Suspense>
        )}
      </div>

      <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-green-800">
            {isSpanish ? 'Progreso del curso' : 'Course progress'}
          </span>
          <span className="text-sm font-bold text-green-700">{completedCount}/{exam.sections.length}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-200">
          <div
            className="h-full rounded-full bg-green-600"
            style={{ width: `${completedCount / exam.sections.length * 100}%` }}
          />
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-gray-500">
        {isSpanish
          ? 'Las puntuaciones de práctica incluyen la autoevaluación del estudiante en las respuestas escritas.'
          : 'Practice scores include learner self-assessment on written responses.'}
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
              href={`/math/exams/${exam.slug}/${section.slug}${isSpanish ? '?lang=es' : ''}`}
              className="block"
            >
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {section.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">{isSpanish ? section.title.es : section.title.en}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {section.questionIds.length} {isSpanish ? 'preguntas publicadas' : 'released questions'}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {bestPercentage === null ? (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      {isSpanish ? 'Empezar →' : 'Start →'}
                    </span>
                  ) : (
                    <>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        {bestPercentage}%
                      </span>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {Number(sectionProgress!.attempts)}{' '}
                        {Number(sectionProgress!.attempts) === 1
                          ? (isSpanish ? 'intento' : 'attempt')
                          : (isSpanish ? 'intentos' : 'attempts')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="mt-6">
        <NYSEDAttribution exam={exam} isSpanish={isSpanish} />
      </div>
    </div>
  )
}
