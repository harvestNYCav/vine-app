'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VocabItem } from '@/types'

interface Card extends VocabItem {
  wordId: string
  moduleSlug: string
}

interface Props {
  cards: Card[]
}

type Rating = 'hard' | 'ok' | 'easy'

export default function PracticeClient({ cards }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  const card = cards[index]

  const handleRate = async (rating: Rating) => {
    await fetch('/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: card.wordId, moduleSlug: card.moduleSlug, rating }),
    })

    if (index + 1 >= cards.length) {
      setReviewed(reviewed + 1)
      setDone(true)
    } else {
      setReviewed(reviewed + 1)
      setIndex(index + 1)
      setFlipped(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🌟</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">Review complete!</h2>
        <p className="text-gray-500 mb-1">You reviewed {reviewed} words today.</p>
        <p className="text-gray-400 text-sm mb-8">Repasaste {reviewed} palabras hoy.</p>
        <button
          onClick={() => router.push('/home')}
          className="bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors"
        >
          Back home / Inicio
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-400 mb-4">{index + 1} / {cards.length}</p>

      {/* Card */}
      <button
        onClick={() => setFlipped(!flipped)}
        className={`w-full rounded-3xl p-8 text-center shadow-md border-2 transition-all min-h-[200px] flex flex-col items-center justify-center mb-6 ${
          flipped
            ? 'bg-green-700 border-green-700 text-white'
            : 'bg-white border-gray-200 text-gray-800 hover:border-green-300'
        }`}
      >
        {!flipped ? (
          <>
            <p className="text-3xl font-bold mb-2">{card.en}</p>
            <p className="text-gray-400 text-sm">{card.pronunciation}</p>
            <p className="text-gray-300 text-xs mt-4">Tap to flip / Toca para voltear</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold mb-2">{card.es}</p>
            <p className="text-white/80 text-sm italic mt-2">&ldquo;{card.exampleEn}&rdquo;</p>
            <p className="text-white/60 text-xs italic mt-1">&ldquo;{card.exampleEs}&rdquo;</p>
          </>
        )}
      </button>

      {/* Rating Buttons */}
      {flipped && (
        <div>
          <p className="text-center text-sm text-gray-500 mb-3">How well do you know this? / ¿Qué tan bien lo sabes?</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRate('hard')}
              className="bg-red-50 border-2 border-red-200 text-red-700 font-semibold py-4 rounded-2xl hover:bg-red-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">😅</span>
              Hard
              <span className="block text-xs opacity-70">Difícil</span>
            </button>
            <button
              onClick={() => handleRate('ok')}
              className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 font-semibold py-4 rounded-2xl hover:bg-yellow-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">🙂</span>
              OK
              <span className="block text-xs opacity-70">Bien</span>
            </button>
            <button
              onClick={() => handleRate('easy')}
              className="bg-green-50 border-2 border-green-300 text-green-700 font-semibold py-4 rounded-2xl hover:bg-green-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">😄</span>
              Easy
              <span className="block text-xs opacity-70">Fácil</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
