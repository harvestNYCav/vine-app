import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await getSession()
  if (session) {
    redirect(session.role === 'tutor' ? '/tutor' : session.role === 'admin' ? '/admin' : '/home')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-amber-50">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-4xl">🌿</span>
        </div>
        <h1 className="text-4xl font-bold text-green-800 mb-1">Vine</h1>
        <p className="text-green-700 text-lg">Community Tutoring Program</p>
      </div>

      {/* Role Selection */}
      <div className="w-full max-w-sm space-y-4">
        <p className="text-center text-gray-600 text-sm mb-6">
          Who are you?
        </p>

        <Link href="/login?role=student" className="block">
          <button className="w-full bg-green-700 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-green-800">
            I&apos;m a Student
          </button>
        </Link>

        <Link href="/login?role=tutor" className="block">
          <button className="w-full bg-amber-600 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-amber-700">
            I&apos;m a Tutor
          </button>
        </Link>

        <Link href="/login?role=admin" className="block">
          <button className="w-full bg-slate-700 text-white text-xl font-semibold py-5 px-6 rounded-2xl shadow-md active:scale-95 transition-transform hover:bg-slate-800">
            Admin
            <span className="block text-sm font-normal opacity-80 mt-0.5">Program dashboard</span>
          </button>
        </Link>
      </div>

      <p className="mt-12 text-center text-xs text-gray-400">
        Vine Tutoring · Kips Bay, New York
      </p>
    </div>
  )
}
