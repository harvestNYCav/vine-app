'use client'

import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const BASE_PATH = '/vine-app'

const NAV_ITEMS = [
  { href: '/family', label: 'Home', emoji: '🏠' },
  { href: '/family/lessons', label: 'Lessons', emoji: '📖' },
  { href: '/family/progress', label: 'Progress', emoji: '⭐' },
]

function withBasePath(href: string) {
  return href.startsWith(BASE_PATH) ? href : `${BASE_PATH}${href}`
}

function ParentBottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const lang = searchParams.get('lang')
  const normalizedPathname = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname
  const activeMode = mode === 'math' || normalizedPathname.startsWith('/family/skills')
    ? 'math'
    : mode === 'ela'
    ? 'ela'
    : null

  const buildHref = (href: string) => {
    if (href === '/family') return withBasePath(href)
    const params = new URLSearchParams()
    if (activeMode) params.set('mode', activeMode)
    if (activeMode === 'math' && lang === 'es') params.set('lang', 'es')
    const qs = params.toString()
    return withBasePath(qs ? `${href}?${qs}` : href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => {
          const active = normalizedPathname === item.href
            || (item.href !== '/family' && normalizedPathname.startsWith(item.href))
          return (
            <a
              key={item.href}
              href={buildHref(item.href)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors min-w-0 ${
                active ? 'text-sky-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={`text-xs font-medium mt-0.5 ${active ? 'text-sky-700' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}

export default function ParentBottomNav() {
  return (
    <Suspense>
      <ParentBottomNavInner />
    </Suspense>
  )
}
