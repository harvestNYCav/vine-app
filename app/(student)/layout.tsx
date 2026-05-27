import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import BottomNav from './BottomNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role !== 'student') redirect('/tutor')

  return (
    <div className="min-h-screen flex flex-col bg-amber-50 pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
