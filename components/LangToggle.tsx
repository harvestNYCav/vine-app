'use client'
import { usePathname, useSearchParams } from 'next/navigation'

interface Props { currentLang: 'en' | 'es' }

const BASE_PATH = '/vine-app'

function withBasePath(href: string) {
  return href.startsWith(BASE_PATH) ? href : `${BASE_PATH}${href}`
}

export default function LangToggle({ currentLang }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const normalizedPathname = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname

  const buildHref = (lang: 'en' | 'es') => {
    const params = new URLSearchParams(searchParams.toString())
    if (lang === 'en') {
      params.delete('lang')
    } else {
      params.set('lang', 'es')
    }
    const qs = params.toString()
    return withBasePath(qs ? `${normalizedPathname}?${qs}` : normalizedPathname)
  }

  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
      <a href={buildHref('en')}>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentLang === 'en' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>EN</span>
      </a>
      <a href={buildHref('es')}>
        <span className={`block px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          currentLang === 'es' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}>ES</span>
      </a>
    </div>
  )
}
