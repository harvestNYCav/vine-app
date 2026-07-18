'use client'

import ModuleSlideDeck from '@/components/ModuleSlideDeck'
import { useEffect, useMemo, useState } from 'react'
import { clearDraft, loadDraft, LONG_FORM_DRAFT_TTL_MS, saveDraft, userDraftKey } from '@/lib/resumable-work'
import type { Module } from '@/types'

type ReviewDraft = { slideIndex: number }

function isReviewDraft(value: unknown): value is ReviewDraft {
  return !!value && typeof value === 'object'
    && Number.isInteger((value as ReviewDraft).slideIndex)
    && (value as ReviewDraft).slideIndex >= 0
}

export default function ReviewSlidesClient({ mod, userId }: { mod: Module; userId: string }) {
  const draftKey = useMemo(() => userDraftKey(userId, 'review', mod.slug), [mod.slug, userId])
  const [initialIndex, setInitialIndex] = useState<number | null>(null)

  useEffect(() => {
    try {
      const draft = loadDraft(window.localStorage, draftKey, isReviewDraft, LONG_FORM_DRAFT_TTL_MS)
      setInitialIndex(draft?.slideIndex ?? 0)
    } catch {
      setInitialIndex(0)
    }
  }, [draftKey])

  const handleFinish = () => {
    try {
      clearDraft(window.localStorage, draftKey)
    } catch {
      // Progress can still be recorded when browser storage is unavailable.
    }
    fetch('/vine-app/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vocab_viewed', data: { moduleSlug: mod.slug } }),
    }).catch(() => {})
  }

  if (initialIndex === null) {
    return <div className="min-h-screen bg-gray-900 text-center text-gray-300 py-20">Restoring your review…</div>
  }

  return (
    <ModuleSlideDeck
      mod={mod}
      variant="student"
      initialIndex={initialIndex}
      onIndexChange={slideIndex => {
        try {
          saveDraft(window.localStorage, draftKey, { slideIndex })
        } catch {
          // The review remains usable even if storage is disabled.
        }
      }}
      onFinish={handleFinish}
    />
  )
}
