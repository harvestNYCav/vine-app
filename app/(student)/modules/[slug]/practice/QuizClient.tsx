'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Module, QuizQuestion } from '@/types'
import Link from 'next/link'

interface Props {
  mod: Module
}

export default function QuizClient({ mod }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ questionId: string; correct: boolean }>>([])
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const question: QuizQuestion = mod.quiz[currentIndex]
  const isAnswered = selected !== null
  const isCorrect = selected === question.answer

  const handleSelect = (option: string) => {
    if (isAnswered) return
    setSelected(option)
  }

  const handleNext = async () => {
    const newResults = [...results, { questionId: question.id, correct: selected === question.answer }]
    setResults(newResults)

    if (currentIndex + 1 >= mod.quiz.length) {
      // Quiz complete
      setSaving(true)
      const score = Math.round((newResults.filter(r => r.correct).length / mod.quiz.length) * 100)

      // Map quiz results to vocab word IDs
      const wordResults = mod.vocab.slice(0, mod.quiz.length).map((v, i) => ({
        wordId: `${mod.slug}:${v.id}`,
        correct: newResults[i]?.correct ?? false,
      }))

      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'practice_completed',
          data: { moduleSlug: mod.slug, score, wordResults },
        }),
      })

      setSaving(false)
      setDone(true)
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelected(null)
    }
  }

  if (done) {
    const correct = results.filter(r => r.correct).length
    const pct = Math.round((correct / mod.quiz.length) * 100)
    const isPerfect = pct === 100
    const isGood = pct >= 60

    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">{isPerfect ? '🏆' : isGood ? '🌟' : '💪'}</div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          {isPerfect ? 'Perfect!' : isGood ? 'Well done!' : 'Keep going!'}
        </h2>
        <p className="text-gray-500 mb-1">
          {isPerfect ? '¡Perfecto!' : isGood ? '¡Bien hecho!' : '¡Sigue adelante!'}
        </p>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 my-6">
          <p className="text-5xl font-bold text-green-700 mb-1">{pct}%</p>
          <p className="text-gray-500">{correct}/{mod.quiz.length} correct / correctas</p>
        </div>

        <div className="space-y-3">
          <Link href={`/modules/${mod.slug}/teach`} className="block">
            <button className="w-full bg-purple-600 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-purple-700 active:scale-95 transition-transform">
              🎓 Now teach Carlos!
              <span className="block text-sm font-normal opacity-80 mt-0.5">¡Ahora enséñale a Carlos!</span>
            </button>
          </Link>
          <Link href={`/modules/${mod.slug}`} className="block">
            <button className="w-full bg-gray-100 text-gray-700 text-base font-medium py-3 rounded-2xl">
              ← Back to lesson / Regresar
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 text-2xl">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-green-800">{mod.titleEn} — Quiz</h1>
          <p className="text-xs text-gray-500">{mod.titleEs}</p>
        </div>
        <span className="text-sm text-gray-400">{currentIndex + 1}/{mod.quiz.length}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex) / mod.quiz.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
        <p className="font-semibold text-gray-800 text-lg mb-1">{question.promptEn}</p>
        <p className="text-gray-400 text-sm">{question.promptEs}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options?.map(option => {
          let style = 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
          if (isAnswered) {
            if (option === question.answer) {
              style = 'bg-green-50 border-green-500 text-green-800'
            } else if (option === selected) {
              style = 'bg-red-50 border-red-400 text-red-700'
            } else {
              style = 'bg-gray-50 border-gray-200 text-gray-400'
            }
          }

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`w-full text-left border-2 rounded-2xl p-4 font-medium transition-all ${style}`}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Feedback + Next */}
      {isAnswered && (
        <div className={`rounded-2xl p-4 mb-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '✓ Correct! / ¡Correcto!' : `✗ The answer is: "${question.answer}"`}
          </p>
        </div>
      )}

      {isAnswered && (
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform"
        >
          {currentIndex + 1 >= mod.quiz.length ? (saving ? 'Saving...' : 'See Results →') : 'Next →'}
        </button>
      )}
    </div>
  )
}
