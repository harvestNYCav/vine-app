import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'tutor') redirect('/home')

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-600 text-white px-4 py-3 flex items-center gap-3 shadow">
        <span className="text-2xl">🌿</span>
        <div className="flex-1">
          <p className="font-bold">Vine Tutoring</p>
          <p className="text-amber-100 text-xs">Tutor: {session.name}</p>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/tutor/session" className="text-amber-200 text-xs hover:text-white">Session</Link>
          <Link href="/tutor/cohort" className="text-amber-200 text-xs hover:text-white">Cohort</Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-amber-200 text-xs hover:text-white">Exit</button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  )
}
