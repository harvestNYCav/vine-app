'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import RegentsAttribution from '@/components/regents/RegentsAttribution'
import RegentsPassage from '@/components/regents/RegentsPassage'
import InlineEmphasis from '@/components/regents/InlineEmphasis'
import type {
  PublicRegentsQuestion,
  RegentsChoice,
  RegentsExam,
  RegentsPassage as RegentsPassageData,
} from '@/content/regents/types'
import { nextUnansweredQuestionIndex } from '@/lib/resumable-work'

type ExamSummary = Pick<RegentsExam, 'id' | 'slug' | 'course' | 'administration' | 'year' | 'sourceUrl' | 'answerKeyUrl'>
type SectionSummary = { slug: string; title: string; passage?: RegentsPassageData }
type SavedResponse = { questionId: string; answer: RegentsChoice }
type Feedback = { correct: boolean; answer: RegentsChoice; correctAnswer: RegentsChoice; explanation: string; explanationSource: 'official-nysed' | 'vine-authored' }
type Result = { pointsEarned: number; pointsPossible: number; percentage: number }

export default function RegentsPracticeClient({ exam, section }: { exam: ExamSummary; section: SectionSummary }) {
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PublicRegentsQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState<RegentsChoice | null>(null)
  const [responses, setResponses] = useState<SavedResponse[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resumed, setResumed] = useState(false)
  const started = useRef(false)
  const question = questions[questionIndex]
  const sectionHref = `/regents/${exam.course}/${exam.slug}/${section.slug}`

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/vine-app/api/regents/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, course: exam.course }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Practice could not be loaded')
    return data
  }

  async function finish(id: string) {
    setLoading(true)
    setError('')
    try {
      const data: Result = await post({ action: 'finish', attemptId: id })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish practice')
    } finally {
      setLoading(false)
    }
  }

  async function start() {
    setLoading(true)
    setError('')
    setResult(null)
    setFeedback(null)
    try {
      const data = await post({ action: 'start', examId: exam.id, sectionSlug: section.slug })
      if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('No reviewed questions are available yet')
      const saved: SavedResponse[] = Array.isArray(data.responses) ? data.responses : []
      const next = nextUnansweredQuestionIndex(
        data.questions.map((item: PublicRegentsQuestion) => item.id),
        saved,
      )
      setAttemptId(data.attemptId)
      setQuestions(data.questions)
      setResponses(saved)
      setResumed(saved.length > 0)
      setQuestionIndex(next < 0 ? 0 : next)
      setAnswer(null)
      if (next < 0) await finish(data.attemptId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start practice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void start()
    // The page starts one attempt on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function check() {
    if (!attemptId || !question || !answer || loading) return
    setLoading(true)
    setError('')
    try {
      const data: Feedback = await post({ action: 'check', attemptId, questionId: question.id, answer })
      setFeedback(data)
      setAnswer(data.answer)
      setResponses(current => [...current.filter(item => item.questionId !== question.id), { questionId: question.id, answer: data.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check answer')
    } finally {
      setLoading(false)
    }
  }

  function next() {
    if (!attemptId || !feedback || !question) return
    const nextIndex = nextUnansweredQuestionIndex(questions.map(item => item.id), responses)
    if (nextIndex < 0) {
      void finish(attemptId)
      return
    }
    setQuestionIndex(nextIndex)
    setAnswer(null)
    setFeedback(null)
    setError('')
    setResumed(false)
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <Link href={sectionHref} className="text-sm font-medium text-gray-600 hover:text-gray-900">← Back to lesson</Link>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-700">Regents practice · {exam.administration} {exam.year}</p>
      <h1 className="mt-1 text-2xl font-bold text-green-800">{section.title}</h1>

      {result ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-xl font-bold text-green-900">Practice complete</h2>
          <p className="mt-3 text-4xl font-bold text-green-800">{result.percentage}%</p>
          <p className="mt-1 text-sm text-green-800">{result.pointsEarned} of {result.pointsPossible} correct</p>
          <p className="mt-2 text-xs text-green-800">Practice percentage only—not an official Regents score.</p>
          <div className="mt-5 flex gap-3">
            <Link href={sectionHref} className="flex-1 rounded-xl bg-white px-3 py-3 font-medium text-green-900">Lesson</Link>
            <button type="button" onClick={() => void start()} disabled={loading} className="flex-1 rounded-xl bg-green-700 px-3 py-3 font-medium text-white disabled:opacity-50">Try again</button>
          </div>
        </div>
      ) : question ? (
        <>
          {resumed && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Your saved answers have been restored.</p>}
          <div className="mt-5 flex justify-between text-xs font-semibold text-gray-500">
            <span>Question {questionIndex + 1} of {questions.length}</span>
            <span>Official question {question.number}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full bg-green-600" style={{ width: `${(questionIndex + 1) / questions.length * 100}%` }} />
          </div>

          {section.passage && <div className="mt-5"><RegentsPassage passage={section.passage} /></div>}

          <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {question.image ? (
              <>
                <Image
                  src={question.image.src}
                  alt={question.image.alt}
                  width={question.image.width}
                  height={question.image.height}
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="h-auto w-full rounded-xl border border-gray-100"
                  loading="eager"
                />
                <p className="sr-only">{question.prompt}</p>
              </>
            ) : (
              <h2 className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-gray-900"><InlineEmphasis text={question.prompt} /></h2>
            )}

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold text-gray-700">Choose one answer</legend>
              <div className="space-y-2">
                {question.choices.map(choice => (
                  <label key={choice.label} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed ${answer === choice.label ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'} ${feedback ? 'cursor-default' : ''}`}>
                    <input
                      type="radio"
                      name={`regents-${question.id}`}
                      value={choice.label}
                      checked={answer === choice.label}
                      disabled={loading || !!feedback}
                      onChange={() => setAnswer(choice.label)}
                      className="mt-1 accent-green-700"
                    />
                    <span className="font-bold text-gray-700">{choice.label}</span>
                    <span className="whitespace-pre-wrap text-gray-800"><InlineEmphasis text={choice.text} /></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {!feedback ? (
              <button type="button" onClick={() => void check()} disabled={loading || !answer} className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">
                {loading ? 'Checking…' : 'Check answer'}
              </button>
            ) : (
              <div className={`mt-5 rounded-xl border p-4 ${feedback.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <p className={`font-bold ${feedback.correct ? 'text-green-900' : 'text-red-800'}`}>
                  {feedback.correct ? 'Correct!' : `The correct answer is ${feedback.correctAnswer}.`}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {feedback.explanationSource === 'official-nysed' ? 'Official NYSED rationale' : 'Vine explanation'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{feedback.explanation}</p>
                <button type="button" onClick={next} disabled={loading} className="mt-4 w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">
                  {loading ? 'Saving…' : 'Continue →'}
                </button>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-600">
          {loading ? 'Preparing your practice…' : 'Practice is not available right now.'}
          {!loading && <button type="button" onClick={() => void start()} className="mt-4 block w-full rounded-xl bg-green-700 p-3 font-semibold text-white">Try again</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6"><RegentsAttribution exam={exam} /></div>
    </main>
  )
}
