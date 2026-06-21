'use client'

import { useState } from 'react'

interface AdminEmail {
  email: string
  createdAt: number
}

export default function AdminAllowlistControls({ initialEmails }: { initialEmails: AdminEmail[] }) {
  const [emails, setEmails] = useState(initialEmails)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const addEmail = async () => {
    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail.includes('@')) {
      setMessage('Enter a valid email.')
      return
    }

    setSaving(true)
    setMessage('')
    const res = await fetch('/vine-app/api/admin/admin-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nextEmail }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setMessage(data.error || 'Could not add email.')
      return
    }

    setEmails(prev => [
      { email: data.email, createdAt: data.createdAt },
      ...prev.filter(item => item.email !== data.email),
    ])
    setEmail('')
    setMessage('Email approved')
  }

  const removeEmail = async (targetEmail: string) => {
    setMessage('')
    const res = await fetch('/vine-app/api/admin/admin-emails', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || 'Could not remove email.')
      return
    }
    setEmails(prev => prev.filter(item => item.email !== targetEmail))
    setMessage('Email removed')
  }

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Admin access</h2>
          <p className="text-sm text-slate-500">Approve emails that are allowed to create admin accounts.</p>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              setMessage('')
            }}
            onKeyDown={e => e.key === 'Enter' && addEmail()}
            placeholder="admin@example.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500 md:w-64"
          />
          <button
            type="button"
            onClick={addEmail}
            disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Approve'}
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-xs text-slate-500">{message}</p>}

      <div className="mt-4 space-y-2">
        {emails.length === 0 ? (
          <p className="text-sm text-slate-400">No pending admin emails.</p>
        ) : emails.map(item => (
          <div key={item.email} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{item.email}</p>
              <p className="text-xs text-slate-400">Approved {new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              type="button"
              onClick={() => removeEmail(item.email)}
              className="text-xs font-semibold text-slate-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
