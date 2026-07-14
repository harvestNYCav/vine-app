import type { Module, VocabItem } from '@/types'

export function getMatchingItems(mod: Module): VocabItem[] {
  if (mod.track !== 'esl') return []
  return mod.vocab.slice(0, Math.min(8, mod.vocab.length))
}
