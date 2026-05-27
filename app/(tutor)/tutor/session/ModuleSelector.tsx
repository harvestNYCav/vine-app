'use client'

import { useRouter } from 'next/navigation'
import { ALL_MODULES } from '@/content/modules'

export default function ModuleSelector({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleSlug: e.target.value }),
    })
    router.refresh()
  }

  return (
    <select
      defaultValue={currentSlug}
      onChange={handleChange}
      className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      {ALL_MODULES.map(m => (
        <option key={m.slug} value={m.slug}>{m.titleEn}</option>
      ))}
    </select>
  )
}
