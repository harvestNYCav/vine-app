'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { Track } from '@/types'

interface Props {
  currentMode: Track
  availableTracks?: Track[]
}

function ModeToggleInner({ currentMode, availableTracks = ['ela', 'esl', 'math'] }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (mode: Track) => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'esl') {
      params.delete('mode')
    } else {
      params.set('mode', mode)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  if (availableTracks.length <= 1) return null

  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
      {availableTracks.map(track => (
        <Link key={track} href={buildHref(track)} replace>
          <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentMode === track ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}>
            {track.toUpperCase()}
          </span>
        </Link>
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
