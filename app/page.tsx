import Link from 'next/link'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LangToggle from '@/components/LangToggle'
import { LANDING_COPY, normalizeAuthLang } from '@/lib/auth-copy'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const session = await getSession()
  if (session) {
    redirect(
      session.role === 'tutor' ? '/tutor'
      : session.role === 'admin' ? '/admin'
      : session.role === 'parent' ? '/family'
      : '/home',
    )
  }

  const language = normalizeAuthLang(lang)
  const copy = LANDING_COPY[language]
  const langQuery = language === 'es' ? '&lang=es' : ''

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 bg-amber-50">
      <div className="w-full max-w-sm flex justify-end">
        <Suspense>
          <LangToggle currentLang={language} />
        </Suspense>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center w-full">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-4xl font-bold text-green-800 mb-1">Vine</h1>
          <p className="text-green-700 text-lg">{copy.tagline}</p>
        </div>

        {/* Role Selection */}
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-gray-600 text-sm mb-6">
            {copy.prompt}
          </p>

          <Link href={`/login?role=student${langQuery}`} className="block">
            <button className="w-full bg-green-700 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-green-800">
              {copy.student}
            </button>
          </Link>

          <Link href={`/login?role=parent${langQuery}`} className="block">
            <button className="w-full bg-sky-700 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-sky-800">
              {copy.parent}
            </button>
          </Link>

          <Link href={`/login?role=tutor${langQuery}`} className="block">
            <button className="w-full bg-amber-600 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-amber-700">
              {copy.tutor}
            </button>
          </Link>

          <Link href={`/login?role=admin${langQuery}`} className="block">
            <button className="w-full bg-slate-700 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-slate-800">
              {copy.admin}
              <span className="block text-sm font-normal opacity-80 mt-0.5">{copy.adminSubtitle}</span>
            </button>
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-gray-400">
          {copy.footer}
        </p>
      </div>
    </div>
  )
}
