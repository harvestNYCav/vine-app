import type { MathExamDefinition } from '@/content/math-exams/types'

export default function NYSEDAttribution({
  exam,
  isSpanish,
}: {
  exam: MathExamDefinition
  isSpanish: boolean
}) {
  const sourceTitle = isSpanish ? exam.sourceTitle.es : exam.sourceTitle.en
  const sourceUrl = isSpanish ? exam.sourceUrl.es : exam.sourceUrl.en
  const accessDate = /^\d{4}-\d{2}-\d{2}$/.test(exam.accessedAt)
    ? new Date(`${exam.accessedAt}T00:00:00Z`)
    : new Date(exam.accessedAt)
  const accessedAt = new Intl.DateTimeFormat(isSpanish ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(accessDate)

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white/70 p-4 text-xs leading-relaxed text-gray-500">
      <p className="font-semibold text-gray-600">
        {isSpanish ? 'Fuente y aviso' : 'Source and notice'}
      </p>
      <p className="mt-1">
        {isSpanish
          ? 'Preguntas oficiales publicadas con derechos de autor del Departamento de Educación del Estado de Nueva York (NYSED), usadas aquí con fines educativos sin fines de lucro. Vine es independiente y no está afiliada ni respaldada por NYSED.'
          : 'Official released questions are copyrighted by the New York State Education Department (NYSED) and used here for noncommercial educational purposes. Vine is independent and is not affiliated with or endorsed by NYSED.'}
      </p>
      <p className="mt-2">
        {isSpanish ? 'Del' : 'From the'} New York State Education Department.{' '}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-green-700 underline decoration-green-300 underline-offset-2"
        >
          {sourceTitle}
        </a>
        . {isSpanish ? 'Internet. Consultado el' : 'Internet. Accessed'} {accessedAt}.
      </p>
    </aside>
  )
}
