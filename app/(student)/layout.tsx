import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BottomNav from './BottomNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  // Allowlist the role rather than excluding known others. Parents read the same
  // pages, but only through /family, so they never land on an interactive route.
  if (session.role !== 'student') {
    redirect(session.role === 'tutor' ? '/tutor' : session.role === 'admin' ? '/admin' : '/family')
  }

  return (
    <div className="min-h-screen flex flex-col bg-amber-50 pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
