'use client'

import { useRouter } from 'next/navigation'

export default function ParentLogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/vine-app/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={logout} className="text-xs font-semibold text-sky-100 hover:text-white">
      Exit
    </button>
  )
}
