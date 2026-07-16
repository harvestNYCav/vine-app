import type { GradeLevel } from '@/types'

export type { GradeLevel } from '@/types'

export const GRADE_LEVELS = [3, 4, 5, 6, 7, 8] as const satisfies readonly GradeLevel[]

const GRADE_LEVEL_SET = new Set<number>(GRADE_LEVELS)

export function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'number' && GRADE_LEVEL_SET.has(value)
}

export function normalizeGradeLevel(value: unknown): GradeLevel | null {
  return isGradeLevel(value) ? value : null
}
