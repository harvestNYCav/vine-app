import type { Module, VocabItem } from '@/types'

export interface StudyCard extends VocabItem {
  wordId: string
  moduleSlug: string
}

export function toStudyCards(mod: Module): StudyCard[] {
  return mod.vocab.map(v => ({ ...v, wordId: `${mod.slug}:${v.id}`, moduleSlug: mod.slug }))
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const MAX_ROUND_SIZE = 6

export function formatWordCount(count: number): string {
  return `${count} ${count === 1 ? 'word' : 'words'}`
}

export function formatDueWordCount(count: number): string {
  return `${formatWordCount(count)} due`
}

export function formatReviewedWordCount(count: number): string {
  return `You reviewed ${formatWordCount(count)} today.`
}

export function countMatchingRounds(vocabLength: number): number {
  return Math.max(1, Math.ceil(vocabLength / MAX_ROUND_SIZE))
}

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

// Best-effort pass to avoid two items with identical (normalized) `es` text
// landing in the same round, e.g. negation.ts has two items whose es is "no".
function resolveDuplicateEsCollisions(rounds: VocabItem[][]): VocabItem[][] {
  for (let r = 0; r < rounds.length; r++) {
    const seen = new Set<string>()
    for (let i = 0; i < rounds[r].length; i++) {
      const key = normalize(rounds[r][i].es ?? '')
      if (!seen.has(key)) {
        seen.add(key)
        continue
      }
      // Duplicate text within this round — try to swap this item with one
      // from another round that doesn't already contain this text.
      for (let other = 0; other < rounds.length; other++) {
        if (other === r) continue
        const swapIdx = rounds[other].findIndex(
          item => !rounds[r].some(ri => normalize(ri.es ?? '') === normalize(item.es ?? ''))
        )
        if (swapIdx !== -1) {
          const tmp = rounds[other][swapIdx]
          rounds[other][swapIdx] = rounds[r][i]
          rounds[r][i] = tmp
          seen.add(normalize(rounds[r][i].es ?? ''))
          break
        }
      }
    }
  }
  return rounds
}

// Splits vocab into balanced rounds of at most MAX_ROUND_SIZE pairs each.
export function buildMatchingRounds(vocab: VocabItem[]): VocabItem[][] {
  const shuffled = shuffle(vocab)
  const total = shuffled.length
  const numRounds = countMatchingRounds(total)
  const baseSize = Math.floor(total / numRounds)
  const remainder = total % numRounds

  const rounds: VocabItem[][] = []
  let cursor = 0
  for (let r = 0; r < numRounds; r++) {
    const size = baseSize + (r < remainder ? 1 : 0)
    rounds.push(shuffled.slice(cursor, cursor + size))
    cursor += size
  }
  return resolveDuplicateEsCollisions(rounds)
}
