import type { Module, Track } from '@/types'

export type LessonProgressRecord = {
  module_slug: string
  vocab_viewed_at: unknown
  homework_completed_at: unknown
}

export function summarizeLessonProgressForTracks(
  modules: Module[],
  tracks: Track[],
  progress: LessonProgressRecord[],
) {
  const eligibleSlugs = new Set(
    modules.filter(module => tracks.includes(module.track)).map(module => module.slug),
  )
  const completedSlugs = new Set(
    progress
      .filter(row => eligibleSlugs.has(row.module_slug) && !!row.homework_completed_at)
      .map(row => row.module_slug),
  )
  const reviewedSlugs = new Set(
    progress
      .filter(row => eligibleSlugs.has(row.module_slug) && !!row.vocab_viewed_at)
      .map(row => row.module_slug),
  )

  return {
    totalLessons: eligibleSlugs.size,
    completedLessons: completedSlugs.size,
    reviewedLessons: reviewedSlugs.size,
  }
}
