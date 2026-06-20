'use client'

import { useRouter } from 'next/navigation'

export default function TutorLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/vine-app/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleLogout} className="text-amber-200 text-xs hover:text-white">
      Exit
    </button>
  )
}
