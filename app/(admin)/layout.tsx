import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLogoutButton from './AdminLogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/')
  // Allowlist the role rather than excluding known others, so a new role can
  // never fall through into the admin dashboard.
  if (session.role !== 'admin') {
    redirect(session.role === 'tutor' ? '/tutor' : session.role === 'parent' ? '/family' : '/home')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 shadow">
        <span className="text-2xl">🌿</span>
        <div className="flex-1">
          <p className="font-bold">Vine Admin</p>
          <p className="text-slate-300 text-xs">Admin: {session.name}</p>
        </div>
        <AdminLogoutButton />
      </header>
      {children}
    </div>
  )
}
