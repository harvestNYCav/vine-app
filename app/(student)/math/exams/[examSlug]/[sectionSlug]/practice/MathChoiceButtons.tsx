import type { MathExamChoice } from '@/content/math-exams/types'

export default function MathChoiceButtons({
  choiceLabels,
  answer,
  disabled,
  isSpanish,
  onSelect,
}: {
  choiceLabels: MathExamChoice[]
  answer: string
  disabled: boolean
  isSpanish: boolean
  onSelect: (choice: MathExamChoice) => void
}) {
  return (
    <div className={`grid gap-2 ${choiceLabels.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {choiceLabels.map(choice => (
        <button
          key={choice}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(choice)}
          aria-pressed={answer === choice}
          aria-label={isSpanish ? `Opción ${choice}` : `Choice ${choice}`}
          className={`rounded-xl border-2 py-3 text-lg font-bold transition-colors ${
            answer === choice
              ? 'border-green-600 bg-green-50 text-green-800'
              : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'
          } disabled:cursor-default`}
        >
          {choice}
        </button>
      ))}
    </div>
  )
}
