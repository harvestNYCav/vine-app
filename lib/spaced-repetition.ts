// Simplified 3-bucket spaced repetition
// Hard = review in 1 day, OK = 3 days, Easy = 7 days

export type Rating = 'hard' | 'ok' | 'easy'

const INTERVALS: Record<Rating, number> = {
  hard: 1,
  ok: 3,
  easy: 7,
}

export function getNextReviewAt(rating: Rating): number {
  const days = INTERVALS[rating]
  return Date.now() + days * 24 * 60 * 60 * 1000
}

export function isDue(nextReviewAt: number): boolean {
  return Date.now() >= nextReviewAt
}
