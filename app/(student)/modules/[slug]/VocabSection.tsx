'use client'

import { useState } from 'react'
import type { VocabItem } from '@/types'

interface Props {
  vocab: VocabItem[]
  moduleSlug: string
}

export default function VocabSection({ vocab, moduleSlug }: Props) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [viewed, setViewed] = useState(false)

  const handleFlip = (id: string) => {
    const next = new Set(flipped)
    next.has(id) ? next.delete(id) : next.add(id)
    setFlipped(next)

    if (next.size === vocab.length && !viewed) {
      setViewed(true)
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vocab_viewed', data: { moduleSlug } }),
      })
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">
          Vocabulary / Vocabulario
        </h2>
        <span className="text-sm text-gray-400">{flipped.size}/{vocab.length} flipped</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Tap a card to see the translation / Toca para ver la traducción</p>

      <div className="space-y-2">
        {vocab.map(item => (
          <button
            key={item.id}
            onClick={() => handleFlip(item.id)}
            className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
              flipped.has(item.id)
                ? 'bg-green-700 border-green-700 text-white'
                : 'bg-white border-gray-200 text-gray-800 hover:border-green-300'
            }`}
          >
            {!flipped.has(item.id) ? (
              <div>
                <p className="text-lg font-semibold">{item.en}</p>
                <p className="text-sm opacity-60 mt-0.5">{item.pronunciation}</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold">{item.es}</p>
                <p className="text-sm opacity-80 mt-1 italic">&ldquo;{item.exampleEn}&rdquo;</p>
                <p className="text-sm opacity-70 mt-0.5 italic">&ldquo;{item.exampleEs}&rdquo;</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {flipped.size === vocab.length && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-center">
          <p className="text-yellow-700 font-medium text-sm">
            🌟 Great! You reviewed all {vocab.length} words!
          </p>
          <p className="text-yellow-600 text-xs mt-0.5">¡Excelente! Revisaste todas las palabras.</p>
        </div>
      )}
    </div>
  )
}
