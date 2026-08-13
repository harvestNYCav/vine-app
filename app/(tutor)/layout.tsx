import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TutorLogoutButton from './TutorLogoutButton'
import TutorRosterScopeToggle from './TutorRosterScopeToggle'
import { getTutorRosterScope } from '@/lib/tutor-roster-server'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  // Allowlist the role rather than excluding known others, so a new role can
  // never fall through into the tutor dashboard.
  if (session.role !== 'tutor') {
    redirect(session.role === 'admin' ? '/admin' : session.role === 'parent' ? '/family' : '/home')
  }
  const rosterScope = await getTutorRosterScope(session.userId)

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-600 text-white px-4 py-3 flex items-center gap-3 shadow">
        <span className="text-2xl">🌿</span>
        <div className="flex-1">
          <p className="font-bold">Vine Tutoring</p>
          <p className="text-amber-100 text-xs">Tutor: {session.name}</p>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/tutor/check-in" className="text-amber-200 text-xs hover:text-white">Check-in</Link>
          <Link href="/tutor/lessons" className="text-amber-200 text-xs hover:text-white">Lessons</Link>
          <Link href="/tutor/cohort" className="text-amber-200 text-xs hover:text-white">Cohort</Link>
          <TutorLogoutButton />
        </nav>
      </header>
      <div className="border-b border-amber-200 bg-amber-100 px-4 py-2">
        <div className="mx-auto flex max-w-lg justify-end">
          <TutorRosterScopeToggle scope={rosterScope} />
        </div>
      </div>
      {children}
    </div>
  )
}
