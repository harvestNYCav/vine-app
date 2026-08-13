import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { resolveStudentViewResult } from '@/lib/student-view'
import ParentBottomNav from './ParentBottomNav'
import ParentChildSwitcher from './ParentChildSwitcher'
import ParentLogoutButton from './ParentLogoutButton'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  if (session.role === 'student') redirect('/home')
  if (session.role === 'tutor') redirect('/tutor')
  if (session.role === 'admin') redirect('/admin')

  const db = await getDb()
  const resolution = await resolveStudentViewResult(db)
  const view = resolution.status === 'ok' ? resolution.view : null

  return (
    <div className="min-h-screen flex flex-col bg-amber-50 pb-20">
      <header className="flex items-center gap-3 bg-sky-700 px-4 py-3 text-white shadow">
        <span className="text-2xl">🌿</span>
        <div className="flex-1">
          <p className="font-bold">Vine Family</p>
          <p className="text-xs text-sky-100">
            {view ? `Parent: ${session.name} · viewing ${view.studentName}` : `Parent: ${session.name}`}
          </p>
        </div>
        <ParentLogoutButton />
      </header>
      {view && view.children.length > 1 && (
        <div className="border-b border-sky-200 bg-sky-100 px-4 py-2">
          <div className="mx-auto flex max-w-lg justify-end">
            <ParentChildSwitcher students={view.children} selectedId={view.studentId} />
          </div>
        </div>
      )}
      <div className="border-b border-amber-200 bg-amber-100 px-4 py-2">
        <p className="mx-auto max-w-lg text-xs text-amber-800">
          This is a read-only view of what your child sees. Nothing you do here changes their work.
        </p>
      </div>
      {children}
      <ParentBottomNav />
    </div>
  )
}
