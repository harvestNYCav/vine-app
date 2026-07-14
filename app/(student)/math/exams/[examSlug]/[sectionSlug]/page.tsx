import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getMathExamBySlug } from '@/content/math-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import LangToggle from '../../../../LangToggle'
import NYSEDAttribution from '../../NYSEDAttribution'

export default async function MathExamSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string; sectionSlug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const [{ examSlug, sectionSlug }, { lang }] = await Promise.all([params, searchParams])
  const exam = getMathExamBySlug(examSlug)
  const section = exam?.sections.find(item => item.slug === sectionSlug)
  if (!exam || !section) notFound()

  const session = await getSession()
  const db = await getDb()
  const [tracks, settings, progressResult] = await Promise.all([
    getStudentTracks(db, session!.userId),
    getStudentSettings(db, session!.userId),
    db.execute({
      sql: `
        SELECT * FROM math_exam_section_progress
        WHERE user_id = ? AND exam_id = ? AND section_slug = ?
      `,
      args: [session!.userId, exam.id, section.slug],
    }),
  ])
  if (!tracks.includes('math')) notFound()

  const canUseSpanish = settings.mathSpanishEnabled
  const isSpanish = canUseSpanish && lang === 'es'
  const progress = progressResult.rows[0]
  const bestPercentage = progress && Number(progress.best_possible)
    ? Math.round(Number(progress.best_points) / Number(progress.best_possible) * 100)
    : null

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start gap-3">
        <Link
          href={`/math/exams/${exam.slug}${isSpanish ? '?lang=es' : ''}`}
          className="pt-1 text-2xl text-gray-400 hover:text-gray-600"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">{isSpanish ? 'Volver al curso' : 'Back to course'}</span>
        </Link>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {section.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-green-800">{isSpanish ? section.title.es : section.title.en}</h1>
          <p className="text-sm text-gray-500">
            {isSpanish ? 'Matemáticas de Nueva York - Grado 3' : 'New York Grade 3 Math'}
          </p>
        </div>
        {canUseSpanish && (
          <Suspense>
            <LangToggle currentLang={isSpanish ? 'es' : 'en'} />
          </Suspense>
        )}
      </div>

      {bestPercentage !== null && (
        <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-800">{isSpanish ? 'Mejor puntuación de práctica' : 'Best practice score'}</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{bestPercentage}%</span>
          </div>
          <p className="mt-1 text-xs text-green-700">
            {Number(progress.attempts)}{' '}
            {Number(progress.attempts) === 1
              ? (isSpanish ? 'intento completado' : 'completed attempt')
              : (isSpanish ? 'intentos completados' : 'completed attempts')}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {isSpanish
              ? 'Las respuestas escritas, cuando se incluyen, usan la autoevaluación del estudiante.'
              : 'Written responses, when included, use learner self-assessment.'}
          </p>
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">{isSpanish ? 'Idea principal' : 'Big idea'}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {isSpanish ? section.overview.es : section.overview.en}
        </p>
      </section>

      <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">{isSpanish ? 'Lo que aprenderás' : 'What you will learn'}</h2>
        <ul className="mt-3 space-y-2">
          {section.learningGoals.map((goal, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed text-gray-600">
              <span className="font-bold text-green-600" aria-hidden="true">✓</span>
              <span>{isSpanish ? goal.es : goal.en}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{isSpanish ? 'Estrategia' : 'Strategy'}</p>
        <p className="mt-2 text-sm leading-relaxed text-blue-900">
          {isSpanish ? section.strategy.es : section.strategy.en}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-800">{isSpanish ? 'Ejemplo resuelto' : 'Worked example'}</h2>
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm font-medium leading-relaxed text-gray-700">
          {isSpanish ? section.workedExample.prompt.es : section.workedExample.prompt.en}
        </p>
        <ol className="mt-4 space-y-3">
          {section.workedExample.steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-gray-600">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                {index + 1}
              </span>
              <span>{isSpanish ? step.es : step.en}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">
          {isSpanish ? section.workedExample.answer.es : section.workedExample.answer.en}
        </p>
      </section>

      <Link
        href={`/math/exams/${exam.slug}/${section.slug}/practice${isSpanish ? '?lang=es' : ''}`}
        className="block"
      >
        <span className="block w-full rounded-2xl bg-green-700 py-4 text-center text-lg font-semibold text-white shadow transition-transform active:scale-95">
          {isSpanish
            ? `Practicar ${section.questionIds.length} preguntas oficiales →`
            : `Practice ${section.questionIds.length} official questions →`}
        </span>
      </Link>

      <div className="mt-5">
        <NYSEDAttribution exam={exam} isSpanish={isSpanish} />
      </div>
    </div>
  )
}
