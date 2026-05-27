'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/home', label: 'Home', labelEs: 'Inicio', emoji: '🏠' },
  { href: '/modules', label: 'Learn', labelEs: 'Aprender', emoji: '📖' },
  { href: '/practice', label: 'Practice', labelEs: 'Practicar', emoji: '🔄' },
  { href: '/progress', label: 'Progress', labelEs: 'Progreso', emoji: '⭐' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors min-w-0 ${
                active ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={`text-xs font-medium mt-0.5 ${active ? 'text-green-700' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
