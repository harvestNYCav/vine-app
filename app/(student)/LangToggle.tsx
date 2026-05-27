'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Props { currentLang: 'en' | 'es' }

export default function LangToggle({ currentLang }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (lang: 'en' | 'es') => {
    const params = new URLSearchParams(searchParams.toString())
    if (lang === 'en') {
      params.delete('lang')
    } else {
      params.set('lang', 'es')
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
      <Link href={buildHref('en')} replace>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentLang === 'en' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>EN</span>
      </Link>
      <Link href={buildHref('es')} replace>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentLang === 'es' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>ES</span>
      </Link>
    </div>
  )
}
