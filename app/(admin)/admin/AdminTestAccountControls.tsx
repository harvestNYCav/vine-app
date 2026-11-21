'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { looksLikeTestAccountName, type FlaggableRole } from '@/lib/account-visibility'

interface AccountOption {
  id: string
  name: string
  role: FlaggableRole
  isTest: boolean
}

// Marks tutors and parents (and students) as test accounts, and lists the ones already marked.
export default function AdminTestAccountControls({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const testAccounts = accounts.filter(account => account.isTest)
  const realAccounts = accounts.filter(account => !account.isTest)
  const suggestions = realAccounts.filter(account => looksLikeTestAccountName(account.name))

  const setTest = async (account: AccountOption, isTest: boolean) => {
    setBusyId(account.id)
    setMessage('')
    setIsError(false)
    try {
      const response = await fetch('/vine-app/api/admin/test-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.id, isTest }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setIsError(true)
        setMessage(data.error || 'Could not save.')
        return
      }
      setSelectedId('')
      setMessage(isTest ? `${account.name} is now a test account.` : `${account.name} counts again.`)
      router.refresh()
    } catch {
      setIsError(true)
      setMessage('Connection error. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const selected = realAccounts.find(account => account.id === selectedId)

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Test accounts</h2>
        <p className="text-sm text-slate-500">
          Logins made to try Vine out, like a student or tutor account for checking what they see. They never count
          toward the numbers here or on the Impact page, and are hidden from these lists unless “Show test accounts” is on.
        </p>
      </div>

      {testAccounts.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">No test accounts yet.</p>
      ) : (
        <div className="mb-3 flex flex-wrap gap-2">
          {testAccounts.map(account => (
            <span
              key={account.id}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 py-1 pl-3 pr-1 text-xs font-semibold text-violet-800"
            >
              {account.name} · {account.role}
              <button
                type="button"
                onClick={() => setTest(account, false)}
                disabled={busyId !== null}
                aria-label={`${account.name} is not a test account`}
                title="Not a test account"
                className="rounded-full px-1.5 text-violet-500 hover:bg-violet-100 hover:text-violet-900 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">These look like test accounts:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map(account => (
              <button
                key={account.id}
                type="button"
                onClick={() => setTest(account, true)}
                disabled={busyId !== null}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                Mark {account.name} · {account.role}
              </button>
            ))}
          </div>
        </div>
      )}

      {realAccounts.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-0 flex-1 text-xs font-semibold text-slate-600">
            <span className="mb-1 block">Mark another account as a test account</span>
            <select
              value={selectedId}
              onChange={event => {
                setSelectedId(event.target.value)
                setMessage('')
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            >
              <option value="">Choose an account</option>
              {realAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selected || busyId !== null}
            onClick={() => selected && setTest(selected, true)}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Mark as test
          </button>
        </div>
      )}

      <p
        className={`mt-3 min-h-4 text-xs ${isError ? 'text-red-600' : 'text-slate-500'}`}
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
    </section>
  )
}
