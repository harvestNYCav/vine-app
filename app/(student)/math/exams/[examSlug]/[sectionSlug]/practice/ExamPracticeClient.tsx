'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type {
  MathExamDefinition,
  MathExamSectionDefinition,
  PublicMathExamQuestion,
} from '@/content/math-exams/types'
import NYSEDAttribution from '../../../NYSEDAttribution'

type Screen = 'intro' | 'question' | 'results'

type CheckedFeedback = {
  correct: boolean | null
  awardedPoints: number | null
  pointsPossible: number
  correctAnswer: string | null
  explanation: string
  criteria: string[]
  requiresSelfAssessment: boolean
}

type SavedResponse = {
  questionId: string
  answer: string
  selfScore?: number
}

type FinalResult = {
  pointsEarned: number
  pointsPossible: number
  percentage: number
}

export default function ExamPracticeClient({
  exam,
  section,
  isSpanish,
}: {
  exam: MathExamDefinition
  section: MathExamSectionDefinition
  isSpanish: boolean
}) {
  const [screen, setScreen] = useState<Screen>('intro')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PublicMathExamQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checkedAnswer, setCheckedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<CheckedFeedback | null>(null)
  const [selfScore, setSelfScore] = useState<number | null>(null)
  const [responses, setResponses] = useState<SavedResponse[]>([])
  const [result, setResult] = useState<FinalResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const language = isSpanish ? 'es' : 'en'
  const question = questions[questionIndex]

  async function startAttempt() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/vine-app/api/math/exam-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          examId: exam.id,
          sectionSlug: section.slug,
          language,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to start practice')
      setAttemptId(data.attemptId)
      setQuestions(data.questions)
      setQuestionIndex(0)
      setAnswer('')
      setCheckedAnswer(null)
      setFeedback(null)
      setSelfScore(null)
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
      const response = await fetch('/vine-app/api/math/exam-attempt', {
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
      setCheckedAnswer(submittedAnswer)
      setFeedback(data)
      if (!data.requiresSelfAssessment) setSelfScore(data.awardedPoints)
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
      const response = await fetch('/vine-app/api/math/exam-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', attemptId, responses: completedResponses }),
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
    if (loading || !question || !feedback || checkedAnswer === null || selfScore === null) return
    const completedResponses = [
      ...responses.filter(item => item.questionId !== question.id),
      {
        questionId: question.id,
        answer: checkedAnswer,
        ...(feedback.requiresSelfAssessment ? { selfScore } : {}),
      },
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
    setSelfScore(null)
    setError('')
  }

  const sectionHref = `/math/exams/${exam.slug}/${section.slug}${isSpanish ? '?lang=es' : ''}`

  if (screen === 'intro') {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <Link href={sectionHref} className="text-sm font-medium text-gray-500 hover:text-gray-700">← {isSpanish ? 'Volver a la lección' : 'Back to lesson'}</Link>
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-4xl">{section.emoji}</div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-blue-600">
            {isSpanish ? 'Práctica oficial publicada' : 'Official released practice'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-green-800">{isSpanish ? section.title.es : section.title.en}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {isSpanish
              ? `${section.questionIds.length} preguntas del examen de 2026. Las preguntas de opción múltiple y respuesta corta se califican automáticamente. Las respuestas escritas, cuando se incluyen, tienen una guía para que califiques tu propio trabajo.`
              : `${section.questionIds.length} questions from the 2026 test. Multiple-choice and short answers are graded automatically. Written responses, when included, have a guide so you can score your own work.`}
          </p>
          <button
            type="button"
            onClick={() => void startAttempt()}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-green-700 py-4 text-lg font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (isSpanish ? 'Preparando...' : 'Preparing...') : (isSpanish ? 'Comenzar práctica' : 'Begin practice')}
          </button>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="mt-5"><NYSEDAttribution exam={exam} isSpanish={isSpanish} /></div>
      </div>
    )
  }

  if (screen === 'results' && result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <div className="text-5xl">{result.percentage >= 80 ? '🌟' : result.percentage >= 60 ? '👏' : '🌱'}</div>
          <h1 className="mt-4 text-2xl font-bold text-green-800">{isSpanish ? 'Práctica completa' : 'Practice complete'}</h1>
          <p className="mt-2 text-sm text-gray-500">{isSpanish ? section.title.es : section.title.en}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-3xl font-bold text-green-700">{result.percentage}%</p>
              <p className="text-xs text-green-700">{isSpanish ? 'Puntuación de práctica' : 'Practice score'}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-3xl font-bold text-blue-700">{result.pointsEarned}/{result.pointsPossible}</p>
              <p className="text-xs text-blue-700">{isSpanish ? 'Puntos' : 'Points'}</p>
            </div>
          </div>
          {questions.some(item => item.type === 'constructed-response') && (
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              {isSpanish
                ? 'Los puntos de las respuestas escritas incluyen tu propia evaluación con la guía mostrada.'
                : 'Written-response points include your own assessment using the guide shown.'}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Link href={sectionHref} className="flex-1 rounded-2xl bg-gray-100 py-3 font-medium text-gray-700">
              {isSpanish ? 'Lección' : 'Lesson'}
            </Link>
            <button type="button" onClick={() => void startAttempt()} disabled={loading} className="flex-1 rounded-2xl bg-green-700 py-3 font-semibold text-white disabled:opacity-60">
              {isSpanish ? 'Otra vez' : 'Try again'}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="mt-5"><NYSEDAttribution exam={exam} isSpanish={isSpanish} /></div>
      </div>
    )
  }

  if (!question) return null
  const questionImage = isSpanish ? question.image.es : question.image.en
  const questionAlt = isSpanish ? question.image.alt.es : question.image.alt.en

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>{isSpanish ? 'Pregunta' : 'Question'} {questionIndex + 1}/{questions.length}</span>
        <span>{question.points} {question.points === 1 ? (isSpanish ? 'punto' : 'point') : (isSpanish ? 'puntos' : 'points')}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${(questionIndex + 1) / questions.length * 100}%` }} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <Image
            src={questionImage.src}
            alt={questionAlt}
            width={questionImage.width}
            height={questionImage.height}
            sizes="(max-width: 640px) 100vw, 512px"
            className="h-auto w-full"
            loading="eager"
          />
        </div>

        <div className="mt-5">
          {question.type === 'multiple-choice' ? (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-700">{isSpanish ? 'Elige tu respuesta' : 'Choose your answer'}</legend>
              <div className="grid grid-cols-4 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(choice => (
                  <button
                    key={choice}
                    type="button"
                    disabled={loading || !!feedback}
                    onClick={() => setAnswer(choice)}
                    aria-pressed={answer === choice}
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
          ) : question.type === 'short-answer' ? (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">{isSpanish ? 'Tu respuesta' : 'Your answer'}</span>
              <input
                type="text"
                value={answer}
                disabled={loading || !!feedback}
                onChange={event => setAnswer(event.target.value)}
                className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-lg font-semibold outline-none focus:border-green-500 focus:bg-white"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">{isSpanish ? 'Muestra y explica tu trabajo' : 'Show and explain your work'}</span>
              <textarea
                value={answer}
                disabled={loading || !!feedback}
                onChange={event => setAnswer(event.target.value)}
                rows={5}
                className="w-full resize-y rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-green-500 focus:bg-white"
              />
            </label>
          )}
        </div>

        {!feedback ? (
          <button
            type="button"
            onClick={() => void checkAnswer()}
            disabled={loading || !answer.trim()}
            className="mt-4 w-full rounded-2xl bg-green-700 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (isSpanish ? 'Revisando...' : 'Checking...') : (isSpanish ? 'Revisar respuesta' : 'Check answer')}
          </button>
        ) : (
          <div className={`mt-4 rounded-2xl border p-4 ${
            feedback.requiresSelfAssessment
              ? 'border-blue-200 bg-blue-50'
              : feedback.correct
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
          }`}>
            <p className={`font-bold ${
              feedback.requiresSelfAssessment ? 'text-blue-800' : feedback.correct ? 'text-green-800' : 'text-red-700'
            }`}>
              {feedback.requiresSelfAssessment
                ? (isSpanish ? 'Compara tu trabajo' : 'Compare your work')
                : feedback.correct
                  ? (isSpanish ? 'Correcto!' : 'Correct!')
                  : (isSpanish ? `La respuesta correcta es ${feedback.correctAnswer}.` : `The correct answer is ${feedback.correctAnswer}.`)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{feedback.explanation}</p>

            {feedback.requiresSelfAssessment && (
              <>
                <p className="mt-4 text-sm font-bold text-blue-900">{isSpanish ? 'Una respuesta fuerte incluye:' : 'A strong response includes:'}</p>
                <ul className="mt-2 space-y-1.5">
                  {feedback.criteria.map((criterion, index) => (
                    <li key={index} className="flex gap-2 text-sm text-blue-900">
                      <span aria-hidden="true">□</span>
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
                <fieldset className="mt-4">
                  <legend className="text-sm font-bold text-blue-900">{isSpanish ? '¿Cuántos puntos obtuvo tu respuesta?' : 'How many points did your response earn?'}</legend>
                  <div className="mt-2 flex gap-2">
                    {Array.from({ length: question.points + 1 }, (_, value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={loading}
                        onClick={() => setSelfScore(value)}
                        aria-pressed={selfScore === value}
                        className={`flex-1 rounded-xl border-2 py-2 font-bold ${
                          selfScore === value
                            ? 'border-blue-600 bg-white text-blue-800'
                            : 'border-blue-200 bg-blue-100/50 text-blue-600'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            <button
              type="button"
              onClick={continueFromFeedback}
              disabled={loading || selfScore === null}
              className="mt-4 w-full rounded-2xl bg-green-700 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? (isSpanish ? 'Guardando...' : 'Saving...')
                : questionIndex === questions.length - 1
                  ? (isSpanish ? 'Ver resultados' : 'See results')
                  : (isSpanish ? 'Siguiente pregunta →' : 'Next question →')}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="mt-4"><NYSEDAttribution exam={exam} isSpanish={isSpanish} /></div>
    </div>
  )
}
