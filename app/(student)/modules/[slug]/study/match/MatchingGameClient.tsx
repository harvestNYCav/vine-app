'use client'

import { useEffect, useRef, useState } from 'react'
import type { Module, VocabItem } from '@/types'
import { buildMatchingRounds, shuffle } from '@/lib/study'

type Rating = 'hard' | 'ok' | 'easy'

interface Props {
  mod: Module
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MatchingGameClient({ mod }: Props) {
  const [gameRounds, setGameRounds] = useState<VocabItem[][]>(() => buildMatchingRounds(mod.vocab))
  const [roundIndex, setRoundIndex] = useState(0)
  const round = gameRounds[roundIndex]

  const [enTiles, setEnTiles] = useState<VocabItem[]>(() => shuffle(round))
  const [esTiles, setEsTiles] = useState<VocabItem[]>(() => shuffle(round))
  const [selectedEnId, setSelectedEnId] = useState<string | null>(null)
  const [selectedEsId, setSelectedEsId] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [wrongFlashIds, setWrongFlashIds] = useState<Set<string>>(new Set())
  const [mistakesByItem, setMistakesByItem] = useState<Record<string, number>>({})
  const [roundStartedAt, setRoundStartedAt] = useState<number>(() => Date.now())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [roundComplete, setRoundComplete] = useState(false)
  const [bestTimeMs, setBestTimeMs] = useState<number | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)

  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tile order is randomized client-side (Math.random()), which would differ
  // between the server-rendered HTML and the client's first hydration pass.
  // Gate the tile grid behind a mount flag so the pre-hydration markup never
  // depends on that randomness (round.length/counts are deterministic and
  // safe to render immediately — only the shuffled tile order isn't).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Live timer while the round is in progress
  useEffect(() => {
    if (roundComplete) return
    const interval = setInterval(() => setElapsedMs(Date.now() - roundStartedAt), 250)
    return () => clearInterval(interval)
  }, [roundStartedAt, roundComplete])

  const startRound = (items: VocabItem[]) => {
    if (wrongFlashTimeoutRef.current) {
      clearTimeout(wrongFlashTimeoutRef.current)
      wrongFlashTimeoutRef.current = null
    }
    setEnTiles(shuffle(items))
    setEsTiles(shuffle(items))
    setSelectedEnId(null)
    setSelectedEsId(null)
    setMatchedIds(new Set())
    setWrongFlashIds(new Set())
    setMistakesByItem({})
    setRoundStartedAt(Date.now())
    setElapsedMs(0)
    setRoundComplete(false)
    setIsNewBest(false)
  }

  const evaluate = (enId: string, esId: string) => {
    if (enId === esId) {
      const id = enId
      const mistakes = mistakesByItem[id] ?? 0
      const rating: Rating = mistakes === 0 ? 'easy' : mistakes === 1 ? 'ok' : 'hard'
      fetch('/vine-app/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: `${mod.slug}:${id}`, moduleSlug: mod.slug, rating }),
      }).catch(() => {})

      const newMatched = new Set(matchedIds).add(id)
      setMatchedIds(newMatched)
      setSelectedEnId(null)
      setSelectedEsId(null)

      if (newMatched.size === round.length) {
        const finalElapsed = Date.now() - roundStartedAt
        setElapsedMs(finalElapsed)
        setRoundComplete(true)
        if (bestTimeMs === null || finalElapsed < bestTimeMs) {
          setBestTimeMs(finalElapsed)
          setIsNewBest(true)
        }
      }
    } else {
      setMistakesByItem(prev => ({
        ...prev,
        [enId]: (prev[enId] ?? 0) + 1,
        [esId]: (prev[esId] ?? 0) + 1,
      }))
      setWrongFlashIds(new Set([enId, esId]))
      wrongFlashTimeoutRef.current = setTimeout(() => {
        setSelectedEnId(null)
        setSelectedEsId(null)
        setWrongFlashIds(new Set())
        wrongFlashTimeoutRef.current = null
      }, 600)
    }
  }

  const handleTap = (side: 'en' | 'es', id: string) => {
    if (matchedIds.has(id) || wrongFlashIds.size > 0) return

    if (side === 'en') {
      if (selectedEnId === id) {
        setSelectedEnId(null)
        return
      }
      setSelectedEnId(id)
      if (selectedEsId) evaluate(id, selectedEsId)
    } else {
      if (selectedEsId === id) {
        setSelectedEsId(null)
        return
      }
      setSelectedEsId(id)
      if (selectedEnId) evaluate(selectedEnId, id)
    }
  }

  const handleNextRound = () => {
    const nextIndex = roundIndex + 1
    setRoundIndex(nextIndex)
    startRound(gameRounds[nextIndex])
  }

  const handleRetryRound = () => startRound(gameRounds[roundIndex])

  const handlePlayAgain = () => {
    const fresh = buildMatchingRounds(mod.vocab)
    setGameRounds(fresh)
    setRoundIndex(0)
    startRound(fresh[0])
  }

  const tileClass = (id: string, selected: boolean) => {
    if (matchedIds.has(id)) return 'opacity-30 scale-95 pointer-events-none border-gray-100 bg-white text-gray-400'
    if (wrongFlashIds.has(id)) return 'border-red-400 bg-red-50 text-red-700 animate-pulse'
    if (selected) return 'border-green-500 bg-green-50 ring-2 ring-green-300 text-gray-800'
    return 'bg-white border-gray-200 text-gray-800 hover:border-green-300'
  }

  const pairsWithMistakes = round.filter(v => (mistakesByItem[v.id] ?? 0) > 0).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <a href={`/vine-app/modules/${mod.slug}/study`} className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
        <h1 className="font-bold text-green-800 flex-1">{mod.titleEn} — Matching Game</h1>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-2 mt-4">
        <span>Round {roundIndex + 1} of {gameRounds.length}</span>
        <span className="font-mono">⏱ {formatTime(elapsedMs)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${(matchedIds.size / round.length) * 100}%` }}
        />
      </div>

      {roundComplete ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Round Complete!</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 my-6">
            <p className="text-4xl font-bold text-green-700 mb-1">{formatTime(elapsedMs)}</p>
            <p className="text-gray-500 text-sm">
              {pairsWithMistakes === 0 ? 'Perfect — no mistakes!' : `${pairsWithMistakes} pair${pairsWithMistakes === 1 ? '' : 's'} took more than one try`}
            </p>
            {bestTimeMs !== null && (
              <p className="text-xs text-gray-400 mt-2">
                {isNewBest ? '🏆 New best time!' : `Best this session: ${formatTime(bestTimeMs)}`}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {roundIndex < gameRounds.length - 1 ? (
              <button
                onClick={handleNextRound}
                className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform"
              >
                Next Round →
              </button>
            ) : (
              <button
                onClick={handlePlayAgain}
                className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform"
              >
                Play Again
              </button>
            )}
            <button
              onClick={handleRetryRound}
              className="w-full bg-gray-100 text-gray-700 text-base font-medium py-3 rounded-2xl"
            >
              Retry this round
            </button>
            <a href={`/vine-app/modules/${mod.slug}/study`} className="block">
              <button className="w-full text-gray-400 text-sm py-2">← Study Hub</button>
            </a>
          </div>
        </div>
      ) : !mounted ? (
        <div className="text-center py-12 text-gray-400">Shuffling tiles…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {enTiles.map(item => (
              <button
                key={`en-${item.id}`}
                onClick={() => handleTap('en', item.id)}
                disabled={matchedIds.has(item.id)}
                className={`w-full text-left rounded-xl p-3 text-sm font-medium border transition-all duration-300 ${tileClass(item.id, selectedEnId === item.id)}`}
              >
                {item.en}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {esTiles.map(item => (
              <button
                key={`es-${item.id}`}
                onClick={() => handleTap('es', item.id)}
                disabled={matchedIds.has(item.id)}
                className={`w-full text-left rounded-xl p-3 text-sm font-medium border transition-all duration-300 ${tileClass(item.id, selectedEsId === item.id)}`}
              >
                {item.es}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
