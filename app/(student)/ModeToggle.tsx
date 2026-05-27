'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Props {
  currentMode: 'esl' | 'math'
}

function ModeToggleInner({ currentMode }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (mode: 'esl' | 'math') => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'esl') {
      params.delete('mode')
    } else {
      params.set('mode', 'math')
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
      <Link href={buildHref('esl')} replace>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentMode === 'esl' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>
          ESL
        </span>
      </Link>
      <Link href={buildHref('math')} replace>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentMode === 'math' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>
          Math
        </span>
      </Link>
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
