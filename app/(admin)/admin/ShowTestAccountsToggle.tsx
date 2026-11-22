'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// The admin's "Show test accounts" switch. The choice is kept in a cookie, so the student list and
// the check-ins page both follow it.
export default function ShowTestAccountsToggle({ show, count }: { show: boolean; count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      const response = await fetch('/vine-app/api/admin/show-test-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show: !show }),
      })
      if (response.ok) router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={show}
      onClick={toggle}
      disabled={busy}
      title="Test accounts never count toward the numbers. This only changes whether they are listed."
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`relative inline-block h-4 w-7 rounded-full transition-colors ${show ? 'bg-violet-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${show ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      Show test accounts{count > 0 ? ` (${count})` : ''}
    </button>
  )
}
