'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { VocabItem } from '@/types'

export function matchingLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

interface Props {
  enItems: VocabItem[]
  esItems: VocabItem[]
  matchedIds: Set<string>
  onMatchedChange: (ids: Set<string>) => void
  // Tutor-only answer key, shown behind a toggle because the student shares the screen.
  answerKey?: ReactNode
}

// In-class matching: tap an English word and a Spanish translation. Correct pairs are crossed
// out; wrong pairs flash and reset. Tapping a crossed-out pair undoes it.
export default function MatchingPractice({ enItems, esItems, matchedIds, onMatchedChange, answerKey }: Props) {
  const [selectedEnId, setSelectedEnId] = useState<string | null>(null)
  const [selectedEsId, setSelectedEsId] = useState<string | null>(null)
  const [wrongIds, setWrongIds] = useState<{ en: string; es: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const wrongTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The Spanish column is shuffled with Math.random(), so its order can differ between the
  // server render and hydration. Render the grid only after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => () => {
    if (wrongTimeout.current) clearTimeout(wrongTimeout.current)
  }, [])

  const letterById = new Map(esItems.map((item, i) => [item.id, matchingLetter(i)]))

  function check(enId: string, esId: string) {
    if (enId === esId) {
      onMatchedChange(new Set(matchedIds).add(enId))
      setSelectedEnId(null)
      setSelectedEsId(null)
      return
    }
    setWrongIds({ en: enId, es: esId })
    wrongTimeout.current = setTimeout(() => {
      setSelectedEnId(null)
      setSelectedEsId(null)
      setWrongIds(null)
      wrongTimeout.current = null
    }, 600)
  }

  function tap(side: 'en' | 'es', id: string) {
    if (wrongIds) return
    if (matchedIds.has(id)) {
      const next = new Set(matchedIds)
      next.delete(id)
      onMatchedChange(next)
      return
    }
    if (side === 'en') {
      if (selectedEnId === id) return setSelectedEnId(null)
      setSelectedEnId(id)
      if (selectedEsId) check(id, selectedEsId)
    } else {
      if (selectedEsId === id) return setSelectedEsId(null)
      setSelectedEsId(id)
      if (selectedEnId) check(selectedEnId, id)
    }
  }

  function startOver() {
    if (wrongTimeout.current) clearTimeout(wrongTimeout.current)
    wrongTimeout.current = null
    setSelectedEnId(null)
    setSelectedEsId(null)
    setWrongIds(null)
    onMatchedChange(new Set())
  }

  function itemClass(side: 'en' | 'es', id: string, selected: boolean): string {
    const base = 'w-full text-left rounded-xl px-3 py-2 border-2 transition-colors text-xl md:text-2xl'
    const color = side === 'en' ? 'font-semibold text-white' : 'text-amber-300'
    if (matchedIds.has(id)) return `${base} border-transparent line-through opacity-40 ${color}`
    if (wrongIds && (side === 'en' ? wrongIds.en : wrongIds.es) === id) {
      return `${base} border-red-400 bg-red-950 text-red-200 animate-pulse`
    }
    if (selected) return `${base} border-amber-400 bg-gray-700 ${color}`
    return `${base} border-transparent hover:bg-gray-800 ${color}`
  }

  const allMatched = matchedIds.size === enItems.length

  return (
    <div className="w-full max-w-3xl">
      <p className="text-amber-300 text-lg mb-2">Matching Practice</p>
      <p className="text-gray-400 mb-4">
        Student: say which Spanish word matches each English word, then tap both. Copy the pairs into
        your notebook (for example, 1-C).
      </p>
      <div className="flex items-center justify-between text-gray-400 mb-4">
        <span>{allMatched ? 'All matched! 🎉' : `${matchedIds.size} of ${enItems.length} matched`}</span>
        {matchedIds.size > 0 && (
          <button onClick={startOver} className="text-sm px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700">
            Start over
          </button>
        )}
      </div>
      {mounted ? (
        <div className="grid grid-cols-2 gap-x-8">
          <ol className="space-y-1">
            {enItems.map((item, i) => (
              <li key={item.id}>
                <button onClick={() => tap('en', item.id)} className={itemClass('en', item.id, selectedEnId === item.id)}>
                  {i + 1}. {item.en}
                  {matchedIds.has(item.id) && <span className="inline-block ml-2"> → {letterById.get(item.id)}</span>}
                </button>
              </li>
            ))}
          </ol>
          <ol className="space-y-1">
            {esItems.map((item, i) => (
              <li key={item.id}>
                <button onClick={() => tap('es', item.id)} className={itemClass('es', item.id, selectedEsId === item.id)}>
                  {matchingLetter(i)}. {item.es}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="h-64" />
      )}
      {answerKey && (
        <div className="mt-8 text-left">
          <button onClick={() => setShowKey(v => !v)} className="text-sm text-gray-500 hover:text-gray-300 underline">
            {showKey ? 'Hide answer key' : 'Show answer key (tutor only)'}
          </button>
          {showKey && answerKey}
        </div>
      )}
    </div>
  )
}
