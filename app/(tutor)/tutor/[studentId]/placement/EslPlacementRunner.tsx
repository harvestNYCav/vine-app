'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EslLevel, EslLevelId, EslPlacementItem, EslPlacementStage } from '@/content/esl-placement'
import { scorePlacement, scoreStage, type PlacementAnswers, type StageScore } from '@/lib/esl-placement-score'

interface Props {
  studentId: string
  stages: EslPlacementStage[]
  levels: Array<EslLevel & { startLessonTitle: string }>
}

function describeStage(score: StageScore): string {
  if (score.tiebreakCorrect === null) return `${score.coreCorrect}/${score.coreTotal}`
  return `${score.coreCorrect}/${score.coreTotal}, then ${score.coreCorrect + score.tiebreakCorrect}/${score.coreTotal + score.tiebreakTotal} with tiebreakers`
}

function failedMark(stage: EslPlacementStage, score: StageScore): number {
  return score.tiebreakCorrect === null ? stage.passMark : stage.tiebreakPassMark
}

function ItemList({ items, answers, startNumber, onMark }: {
  items: EslPlacementItem[]
  answers: PlacementAnswers
  startNumber: number
  onMark: (itemId: string, passed: boolean) => void
}) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => {
        const value = answers[item.id]
        return (
          <li key={item.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{startNumber + index}. {item.skill}</p>
            <p className="mt-1 text-lg font-medium text-gray-800">“{item.say}”</p>
            {item.card && (
              <div className="mt-2 whitespace-pre-line rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-4 text-center text-2xl leading-relaxed text-gray-900">
                {item.card}
              </div>
            )}
            <p className="mt-2 text-sm text-gray-500"><span className="font-medium text-gray-600">Listen for:</span> {item.listenFor}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onMark(item.id, true)}
                className={`flex-1 rounded-lg border py-2 font-semibold ${value === true ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-green-700 hover:bg-green-50'}`}
              >
                ✓ Yes
              </button>
              <button
                onClick={() => onMark(item.id, false)}
                className={`flex-1 rounded-lg border py-2 font-semibold ${value === false ? 'border-red-400 bg-red-400 text-white' : 'border-gray-200 text-red-600 hover:bg-red-50'}`}
              >
                ✗ Not yet
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function EslPlacementRunner({ studentId, stages, levels }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<PlacementAnswers>({})
  const [stageIndex, setStageIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [level, setLevel] = useState<EslLevelId | null>(null)
  const [readsCards, setReadsCards] = useState<boolean | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const score = scorePlacement(answers)
  const stage = stages[stageIndex]
  const stageScore = scoreStage(stage, answers)
  const coreComplete = stage.items.every(item => item.id in answers)
  const showTiebreakers = coreComplete && stageScore.borderline
  const stageComplete = coreComplete && (!stageScore.borderline || stage.tiebreakers.every(item => item.id in answers))
  const hasNextStage = stageIndex < stages.length - 1
  const chosenLevel = level ?? score.suggestedLevel

  function mark(itemId: string, passed: boolean) {
    setAnswers(prev => ({ ...prev, [itemId]: passed }))
    setError('')
  }

  async function save() {
    if (Object.keys(answers).length === 0) {
      setError('Mark at least one question before saving.')
      return
    }
    if (readsCards === null) {
      setError('Say whether the student read the cards on their own.')
      return
    }
    setSaving(true)
    setError('')
    const response = await fetch('/vine-app/api/tutor/esl-placement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        answers,
        level: chosenLevel === score.suggestedLevel ? null : chosenLevel,
        readsCards,
        note,
      }),
    })
    if (!response.ok) {
      setSaving(false)
      const body = await response.json().catch(() => ({}))
      setError(body.error ?? 'Could not save. Try again.')
      return
    }
    router.push(`/tutor/${studentId}`)
    router.refresh()
  }

  if (finished) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-2">Result</h2>
          <ul className="text-sm text-gray-600 space-y-1 mb-3">
            {stages.map(s => {
              const result = score.stages.find(r => r.stageId === s.id)
              return (
                <li key={s.id}>
                  {s.title}:{' '}
                  {result
                    ? <span className={result.passed ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                        {describeStage(result)} {result.passed ? '· passed' : `· needed ${failedMark(s, result)}`}
                      </span>
                    : <span className="text-gray-400">not given</span>}
                </li>
              )
            })}
          </ul>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Did they read the cards on their own?</p>
          <div className="flex gap-2 mb-4">
            {[
              { value: true, label: 'Yes, read them' },
              { value: false, label: 'No, I read them aloud' },
            ].map(option => (
              <button
                key={String(option.value)}
                onClick={() => { setReadsCards(option.value); setError('') }}
                className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${readsCards === option.value ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 text-gray-700 hover:bg-amber-50'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Level</p>
          <div className="space-y-2">
            {levels.map(option => (
              <label
                key={option.id}
                className={`block cursor-pointer rounded-xl border p-3 ${chosenLevel === option.id ? 'border-amber-400 bg-amber-50' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="level"
                    className="mt-1"
                    checked={chosenLevel === option.id}
                    onChange={() => setLevel(option.id)}
                  />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {option.label}
                      {option.id === score.suggestedLevel && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">suggested</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                    <p className="text-xs text-amber-700 mt-1">Start with: {option.startLessonTitle}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <label className="block mt-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Note (optional)</span>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              placeholder="Anything the next tutor should know: shy, understands more than they say, etc."
              className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
            />
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button onClick={() => setFinished(false)} className="text-sm text-gray-500 hover:text-gray-700">← Back to questions</button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save placement'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="font-bold text-gray-700">{stage.title}</h2>
          <p className="text-xs text-gray-400">checks {stage.coversLessons}</p>
        </div>
        <ItemList items={stage.items} answers={answers} startNumber={1} onMark={mark} />
      </div>

      {showTiebreakers && (
        <div className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-amber-800">Close call: ask {stage.tiebreakers.length} more</h2>
          <p className="text-sm text-gray-500 mb-3">
            {stageScore.coreCorrect}/{stageScore.coreTotal} is too close to call. These check the same skills.
            They need {stage.tiebreakPassMark} of {stage.items.length + stage.tiebreakers.length} in total.
          </p>
          <ItemList items={stage.tiebreakers} answers={answers} startNumber={stage.items.length + 1} onMark={mark} />
        </div>
      )}

      {stageComplete ? (
        <div className={`rounded-2xl border p-4 ${stageScore.passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className="font-semibold text-gray-800">
            {describeStage(stageScore)} on {stage.title.split(' · ')[1]}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {stageScore.passed && hasNextStage
              ? 'Passed. Continue to the next stage.'
              : stageScore.passed
                ? 'Passed. That\'s the whole test.'
                : `Below ${failedMark(stage, stageScore)}, so the test ends here.`}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {stageIndex > 0 ? (
              <button onClick={() => setStageIndex(stageIndex - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Previous stage</button>
            ) : <span />}
            {stageScore.passed && hasNextStage ? (
              <button
                onClick={() => { setStageIndex(stageIndex + 1); window.scrollTo({ top: 0 }) }}
                className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
              >
                Continue to {stages[stageIndex + 1].title.split(' · ')[0]} →
              </button>
            ) : (
              <button
                onClick={() => setFinished(true)}
                className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
              >
                See result →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {stageIndex > 0 ? (
            <button onClick={() => setStageIndex(stageIndex - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Previous stage</button>
          ) : <span />}
          <button
            onClick={() => setFinished(true)}
            className="text-sm text-amber-700 hover:text-amber-800"
          >
            End test now (unmarked count as ✗)
          </button>
        </div>
      )}
    </div>
  )
}
