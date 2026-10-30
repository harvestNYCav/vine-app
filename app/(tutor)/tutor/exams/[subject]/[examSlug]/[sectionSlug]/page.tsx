import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { getTutorExamPreview } from '@/lib/tutor-exam-preview'
import LangToggle from '@/components/LangToggle'
import { ElaPreview, MathPreview } from '../../../TutorExamPreview'

export default async function TutorExamSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ subject: string; examSlug: string; sectionSlug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  // The layout also guards tutor routes, but this check protects answer content itself.
  const session = await getSession()
  if (!session || session.role !== 'tutor') notFound()

  const [{ subject, examSlug, sectionSlug }, { lang }] = await Promise.all([params, searchParams])
  const preview = getTutorExamPreview(subject, examSlug, sectionSlug, typeof lang === 'string' ? lang : undefined)
  if (!preview) notFound()

  const isSpanish = preview.language === 'es'
  const title = preview.subject === 'ela' ? preview.section.title : preview.section.title[preview.language]
  const description = preview.subject === 'ela' ? preview.section.description : preview.section.description[preview.language]
  const libraryHref = `/tutor/exams?subject=${preview.subject}&grade=${preview.exam.grade}&year=${preview.exam.year}`

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6" lang={preview.language}>
      <Link href={libraryHref} className="text-sm font-medium text-amber-800 hover:underline">
        ← {isSpanish ? 'Biblioteca de exámenes' : 'Exam library'}
      </Link>
      <div className="mb-5 mt-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">
            {isSpanish ? 'Vista del tutor' : 'Tutor preview'}
          </p>
          <h1 className="text-2xl font-bold text-green-900">{preview.section.emoji} {title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isSpanish ? `Matemáticas de Nueva York · Grado ${preview.exam.grade}` : `New York ${preview.subject === 'ela' ? 'ELA' : 'Math'} · Grade ${preview.exam.grade}`} · {preview.exam.year}
          </p>
        </div>
        {preview.subject === 'math' && preview.exam.supportedLanguages.includes('es') && (
          <Suspense>
            <LangToggle currentLang={preview.language} />
          </Suspense>
        )}
      </div>
      <p className="mb-4 text-sm leading-relaxed text-gray-600">{description}</p>
      <p className="mb-5 rounded-xl border border-amber-200 bg-amber-100/60 p-3 text-sm leading-relaxed text-amber-900">
        {isSpanish
          ? 'Lee la lección y las preguntas con tu estudiante. Abre las respuestas cuando las necesites; esta vista no registra intentos ni cambia el progreso del estudiante.'
          : 'Read the lesson and questions with your student. Open the answers when you need them; this preview does not record attempts or change student progress.'}
      </p>
      <nav aria-label={isSpanish ? 'En esta página' : 'On this page'} className="mb-6 flex flex-wrap gap-4 text-sm font-semibold text-green-800">
        <a href="#lesson" className="underline underline-offset-4">{isSpanish ? 'Lección' : 'Lesson'}</a>
        <a href="#questions" className="underline underline-offset-4">
          {isSpanish ? 'Preguntas' : 'Questions'} ({preview.questions.length})
        </a>
      </nav>
      {preview.subject === 'ela' ? <ElaPreview preview={preview} /> : <MathPreview preview={preview} />}
    </main>
  )
}
