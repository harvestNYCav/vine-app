'use client'

import ModuleSlideDeck from '@/components/ModuleSlideDeck'
import type { Module } from '@/types'

export default function ReviewSlidesClient({ mod }: { mod: Module }) {
  const handleFinish = () => {
    fetch('/vine-app/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vocab_viewed', data: { moduleSlug: mod.slug } }),
    }).catch(() => {})
  }

  return <ModuleSlideDeck mod={mod} variant="student" onFinish={handleFinish} />
}
