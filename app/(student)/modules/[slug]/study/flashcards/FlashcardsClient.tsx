'use client'

import { useState } from 'react'
import type { Module } from '@/types'
import { toStudyCards, shuffle } from '@/lib/study'

type Rating = 'hard' | 'ok' | 'easy'

interface Props {
  mod: Module
}

export default function FlashcardsClient({ mod }: Props) {
  const isEsl = mod.track === 'esl'
  const [cards] = useState(() => toStudyCards(mod))
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  const [position, setPosition] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratedThisSession, setRatedThisSession] = useState<Set<string>>(new Set())

  const card = cards[order[position]]

  const goTo = (delta: number) => {
    setPosition(prev => (prev + delta + order.length) % order.length)
    setFlipped(false)
  }

  const handleShuffle = () => {
    setOrder(shuffle(cards.map((_, i) => i)))
    setPosition(0)
    setFlipped(false)
  }

  const handleRate = async (rating: Rating) => {
    setRatedThisSession(prev => new Set(prev).add(card.wordId))
    fetch('/vine-app/api/practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: card.wordId, moduleSlug: mod.slug, rating }),
    }).catch(() => {})
    goTo(1)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <a href={`/vine-app/modules/${mod.slug}/study`} className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
        <h1 className="font-bold text-green-800 flex-1">{mod.titleEn} — Flashcards</h1>
        <button
          onClick={handleShuffle}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Shuffle"
          title="Shuffle"
        >
          🔀
        </button>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 mt-4">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(position / order.length) * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-400 mb-4">
        {position + 1} / {cards.length}
        {ratedThisSession.has(card.wordId) && <span className="text-green-600 ml-1">✓</span>}
      </p>

      {/* Card */}
      <button
        onClick={() => { if (isEsl) setFlipped(!flipped) }}
        className={`w-full rounded-3xl p-8 text-center shadow-md border-2 transition-all min-h-[200px] flex flex-col items-center justify-center mb-6 ${
          isEsl && flipped
            ? 'bg-green-700 border-green-700 text-white'
            : 'bg-white border-gray-200 text-gray-800 hover:border-green-300'
        }`}
      >
        {!isEsl ? (
          <>
            <p className="text-3xl font-bold mb-2">{card.en}</p>
            <p className="text-gray-500 text-sm italic mt-2">&ldquo;{card.exampleEn}&rdquo;</p>
          </>
        ) : !flipped ? (
          <>
            <p className="text-3xl font-bold mb-2">{card.en}</p>
            <p className="text-gray-300 text-xs mt-4">Tap to flip</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold mb-2">{card.es}</p>
            <p className="text-white/80 text-sm italic mt-2">&ldquo;{card.exampleEn}&rdquo;</p>
            <p className="text-white/60 text-xs italic mt-1">&ldquo;{card.exampleEs}&rdquo;</p>
          </>
        )}
      </button>

      {/* Prev / Next — free browsing, always available */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => goTo(-1)}
          className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-200 active:scale-95 transition-transform"
        >
          ← Back
        </button>
        <button
          onClick={() => goTo(1)}
          className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-2xl hover:bg-gray-200 active:scale-95 transition-transform"
        >
          Next →
        </button>
      </div>

      {/* Rating Buttons — optional, shown once flipped (ESL) or always (no flip step otherwise) */}
      {(!isEsl || flipped) && (
        <div>
          <p className="text-center text-sm text-gray-500 mb-3">How well do you know this? (optional)</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRate('hard')}
              className="bg-red-50 border-2 border-red-200 text-red-700 font-semibold py-4 rounded-2xl hover:bg-red-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">😅</span>
              Hard
            </button>
            <button
              onClick={() => handleRate('ok')}
              className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 font-semibold py-4 rounded-2xl hover:bg-yellow-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">🙂</span>
              OK
            </button>
            <button
              onClick={() => handleRate('easy')}
              className="bg-green-50 border-2 border-green-300 text-green-700 font-semibold py-4 rounded-2xl hover:bg-green-100 active:scale-95 transition-transform"
            >
              <span className="block text-xl">😄</span>
              Easy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
