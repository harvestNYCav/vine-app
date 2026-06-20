'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { Track } from '@/types'

const BASE_PATH = '/vine-app'

interface Props {
  currentMode: Track
  availableTracks?: Track[]
}

function withBasePath(href: string) {
  return href.startsWith(BASE_PATH) ? href : `${BASE_PATH}${href}`
}

function ModeToggleInner({ currentMode, availableTracks = ['ela', 'esl', 'math'] }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const normalizedPathname = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname

  const buildHref = (mode: Track) => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'esl') {
      params.delete('mode')
    } else {
      params.set('mode', mode)
    }
    const qs = params.toString()
    return withBasePath(qs ? `${normalizedPathname}?${qs}` : normalizedPathname)
  }

  if (availableTracks.length <= 1) return null

  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
      {availableTracks.map(track => (
        <a key={track} href={buildHref(track)}>
          <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentMode === track ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}>
            {track.toUpperCase()}
          </span>
        </a>
      ))}
    </div>
  )
}

export default function ModeToggle(props: Props) {
  return (
    <Suspense>
      <ModeToggleInner {...props} />
    </Suspense>
  )
}
