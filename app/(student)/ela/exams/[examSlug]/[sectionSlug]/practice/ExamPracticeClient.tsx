'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type {
  ElaExamDefinition,
  ElaExamSectionDefinition,
  PublicElaExamQuestion,
} from '@/content/ela-exams/types'
import CollapsiblePassage from '../../../CollapsiblePassage'
import NYSEDAttribution from '../../../NYSEDAttribution'

type Screen = 'intro' | 'question' | 'results'

type CheckedFeedback = {
  correct: boolean
  recordedAnswer: string
  correctAnswer: string
  explanation: string
}

type SavedResponse = {
  questionId: string
  answer: string
}

type FinalResult = {
  pointsEarned: number
  pointsPossible: number
  percentage: number
}

export default function ExamPracticeClient({
  exam,
  section,
}: {
  exam: ElaExamDefinition
  section: ElaExamSectionDefinition
}) {
  const [screen, setScreen] = useState<Screen>('intro')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PublicElaExamQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checkedAnswer, setCheckedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<CheckedFeedback | null>(null)
  const [responses, setResponses] = useState<SavedResponse[]>([])
  const [result, setResult] = useState<FinalResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const question = questions[questionIndex]
  const sectionHref = `/ela/exams/${exam.slug}/${section.slug}`

  async function startAttempt() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/ela/exam-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          examId: exam.id,
          sectionSlug: section.slug,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to start practice')
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No practice questions are available in this section')
      }
      setAttemptId(data.attemptId)
      setQuestions(data.questions)
      setQuestionIndex(0)
      setAnswer('')
      setCheckedAnswer(null)
      setFeedback(null)
      setResponses([])
      setResult(null)
      setScreen('question')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start practice')
    } finally {
      setLoading(false)
    }
  }

  async function checkAnswer() {
    if (!attemptId || !question || !answer.trim()) return
    const submittedAnswer = answer.trim()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/ela/exam-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          attemptId,
          questionId: question.id,
          answer: submittedAnswer,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to check this answer')
      const recordedAnswer = typeof data.recordedAnswer === 'string'
        ? data.recordedAnswer
        : submittedAnswer
      setAnswer(recordedAnswer)
      setCheckedAnswer(recordedAnswer)
      setFeedback(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check this answer')
    } finally {
      setLoading(false)
    }
  }

  async function finishAttempt(completedResponses: SavedResponse[]) {
    if (!attemptId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/ela/exam-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finish',
          attemptId,
          responses: completedResponses,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to finish practice')
      setResult(data)
      setScreen('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to finish practice')
    } finally {
      setLoading(false)
    }
  }

  function continueFromFeedback() {
    if (loading || !question || !feedback || checkedAnswer === null) return
    const completedResponses = [
      ...responses.filter(item => item.questionId !== question.id),
      { questionId: question.id, answer: checkedAnswer },
    ]
    setResponses(completedResponses)

    if (questionIndex === questions.length - 1) {
      void finishAttempt(completedResponses)
      return
    }

    setQuestionIndex(index => index + 1)
    setAnswer('')
    setCheckedAnswer(null)
    setFeedback(null)
    setError('')
  }

  if (screen === 'intro') {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <Link href={sectionHref} className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ← Back to lesson
        </Link>
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-4xl">{section.emoji}</div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">
            New York released ELA practice
          </p>
          <h1 className="mt-1 text-2xl font-bold text-green-800">{section.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {section.questionIds.length} multiple-choice questions from the {exam.year} released test,
            graded automatically.
          </p>

          <div className="mt-5">
            <CollapsiblePassage passage={section.passage} passageLabel={section.passageLabel} />
          </div>

          <button
            type="button"
            onClick={() => void startAttempt()}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-green-700 py-4 text-lg font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Preparing…' : 'Begin practice'}
          </button>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="mt-5">
          <NYSEDAttribution exam={exam} />
        </div>
      </div>
    )
  }

  if (screen === 'results' && result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="text-5xl">
            {result.percentage >= 80 ? '🌟' : result.percentage >= 60 ? '👏' : '🌱'}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-green-800">Practice complete</h1>
          <p className="mt-2 text-sm text-gray-500">{section.title}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-3xl font-bold text-green-700">{result.percentage}%</p>
              <p className="text-xs text-green-700">Practice score</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-3xl font-bold text-blue-700">
                {result.pointsEarned}/{result.pointsPossible}
              </p>
              <p className="text-xs text-blue-700">Points</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Link href={sectionHref} className="flex-1 rounded-2xl bg-gray-100 py-3 font-medium text-gray-700">
              Lesson
            </Link>
            <button
              type="button"
              onClick={() => void startAttempt()}
              disabled={loading}
              className="flex-1 rounded-2xl bg-green-700 py-3 font-semibold text-white disabled:opacity-60"
            >
              Try again
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="mt-5">
          <NYSEDAttribution exam={exam} />
        </div>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>Question {questionIndex + 1}/{questions.length}</span>
        <span>{question.points} point</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-600 transition-all"
          style={{ width: `${(questionIndex + 1) / questions.length * 100}%` }}
        />
      </div>

      <div className="mb-4">
        <CollapsiblePassage
          passage={section.passage}
          passageLabel={section.passageLabel}
          compact
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium leading-relaxed text-gray-500">
          Open the passage above whenever you need it, then choose the best answer below.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <Image
            src={question.image.src}
            alt={question.image.alt}
            width={question.image.width}
            height={question.image.height}
            sizes="(max-width: 640px) 100vw, 512px"
            className="h-auto w-full"
            loading="eager"
          />
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold text-gray-700">Choose your answer</legend>
          <div className="grid grid-cols-4 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map(choice => (
              <button
                key={choice}
                type="button"
                disabled={loading || !!feedback}
                onClick={() => setAnswer(choice)}
                aria-pressed={answer === choice}
                aria-label={`Choice ${choice}`}
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
        </fieldset>

        {!feedback ? (
          <button
            type="button"
            onClick={() => void checkAnswer()}
            disabled={loading || !answer.trim()}
            className="mt-4 w-full rounded-2xl bg-green-700 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check answer'}
          </button>
        ) : (
          <div className={`mt-4 rounded-2xl border p-4 ${
            feedback.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <p className={`font-bold ${feedback.correct ? 'text-green-800' : 'text-red-700'}`}>
              {feedback.correct ? 'Correct!' : `The correct answer is ${feedback.correctAnswer}.`}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{feedback.explanation}</p>
            <button
              type="button"
              onClick={continueFromFeedback}
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-green-700 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Saving…'
                : questionIndex === questions.length - 1
                  ? 'See results'
                  : 'Next question →'}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="mt-4">
        <NYSEDAttribution exam={exam} />
      </div>
    </div>
  )
}
