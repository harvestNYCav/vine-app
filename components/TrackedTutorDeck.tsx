'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Module } from '@/types'
import ModuleSlideDeck from './ModuleSlideDeck'

const ENDPOINT = '/vine-app/api/tutor/deck-progress'
const TICK_MS = 15_000
const HEARTBEAT_MS = 60_000
// A tick gap longer than this means the laptop slept; don't count it as presenting time.
const MAX_TICK_GAP_MS = 2 * TICK_MS

type SlideView = { index: number; count: number; section: string }

// The tutor's lesson deck, reporting how far it got and how long it was on screen so the pilot
// can tell whether lessons fit the 2-hour session.
export default function TrackedTutorDeck({ mod }: { mod: Module }) {
  const view = useRef<SlideView | null>(null)
  const unsentMs = useRef(0)
  const lastTick = useRef(0)

  const takeReport = useCallback(() => {
    if (!view.current) return null
    const report = {
      moduleSlug: mod.slug,
      slideIndex: view.current.index,
      slideCount: view.current.count,
      section: view.current.section,
      activeMs: unsentMs.current,
    }
    unsentMs.current = 0
    return JSON.stringify(report)
  }, [mod.slug])

  const send = useCallback(() => {
    const body = takeReport()
    if (!body) return
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
      .catch(() => {})
  }, [takeReport])

  useEffect(() => {
    lastTick.current = Date.now()

    function tick() {
      const now = Date.now()
      const gap = now - lastTick.current
      lastTick.current = now
      if (document.visibilityState === 'visible' && gap <= MAX_TICK_GAP_MS) unsentMs.current += gap
    }

    function flush() {
      tick()
      const body = takeReport()
      if (body) navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flush()
      else lastTick.current = Date.now()
    }

    const ticker = setInterval(tick, TICK_MS)
    const heartbeat = setInterval(() => { tick(); send() }, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
    return () => {
      clearInterval(ticker)
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [send, takeReport])

  const handleSlideView = useCallback((next: SlideView) => {
    view.current = next
    send()
  }, [send])

  return <ModuleSlideDeck mod={mod} variant="tutor" onSlideView={handleSlideView} />
}
