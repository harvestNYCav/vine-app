import type { AnswerResult, AnswerSection } from '@/lib/lesson-answers'

const SECTION_LABELS: Record<AnswerSection, string> = {
  quiz: 'Quick Check',
  matching: 'Matching',
  'fill-in': 'Fill in the Blank',
}

// Lists graded Quick Check / Homework answers: what the student put, and the right answer for
// anything they missed. Tutors pass `onlyMissed` to see just the mistakes, and an answer label
// that reads right from their side.
export default function AnswerReview({
  results,
  onlyMissed = false,
  answerLabel = 'Your answer',
}: {
  results: AnswerResult[]
  onlyMissed?: boolean
  answerLabel?: string
}) {
  const shown = onlyMissed ? results.filter(result => !result.correct) : results
  const sections = [...new Set(shown.map(result => result.section))]
  const labelSections = new Set(results.map(result => result.section)).size > 1

  if (shown.length === 0) {
    return <p className="text-sm text-gray-500">No missed questions.</p>
  }

  return (
    <div className="space-y-4 text-left">
      {sections.map(section => (
        <div key={section}>
          {labelSections && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{SECTION_LABELS[section]}</p>
          )}
          <ul className="space-y-2">
            {shown.filter(result => result.section === section).map(result => (
              <li
                key={`${result.section}-${result.id}`}
                className={`rounded-xl border p-3 ${result.correct ? 'border-green-100 bg-green-50/60' : 'border-red-100 bg-red-50/60'}`}
              >
                <div className="flex items-start gap-2">
                  <span aria-hidden className={`font-bold ${result.correct ? 'text-green-600' : 'text-red-500'}`}>
                    {result.correct ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-gray-800">
                      <span className="sr-only">{result.correct ? 'Correct: ' : 'Incorrect: '}</span>
                      {result.prompt}
                    </p>
                    <p className={result.correct ? 'text-green-700' : 'text-red-600'}>
                      {answerLabel}: {result.answer || <span className="italic">(blank)</span>}
                    </p>
                    {!result.correct && <p className="text-green-700">Correct answer: {result.expected}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function correctCountLabel(results: AnswerResult[]) {
  return `${results.filter(result => result.correct).length} of ${results.length} correct`
}
