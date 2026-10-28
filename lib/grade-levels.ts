import type { GradeLevel } from '@/types'

export type { GradeLevel } from '@/types'

export const GRADE_LEVELS = [3, 4, 5, 6, 7, 8] as const satisfies readonly GradeLevel[]
export const HIGH_SCHOOL_GRADE_LEVELS = [9, 10, 11, 12] as const
export const STUDENT_SCHOOL_GRADE_LEVELS = [...GRADE_LEVELS, ...HIGH_SCHOOL_GRADE_LEVELS] as const

export type HighSchoolGradeLevel = typeof HIGH_SCHOOL_GRADE_LEVELS[number]
export type StudentSchoolGradeLevel = GradeLevel | HighSchoolGradeLevel

const GRADE_LEVEL_SET = new Set<number>(GRADE_LEVELS)
const HIGH_SCHOOL_GRADE_LEVEL_SET = new Set<number>(HIGH_SCHOOL_GRADE_LEVELS)

export function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'number' && GRADE_LEVEL_SET.has(value)
}

export function normalizeGradeLevel(value: unknown): GradeLevel | null {
  return isGradeLevel(value) ? value : null
}

export function isHighSchoolGradeLevel(value: unknown): value is HighSchoolGradeLevel {
  return typeof value === 'number' && HIGH_SCHOOL_GRADE_LEVEL_SET.has(value)
}

export function normalizeHighSchoolGradeLevel(value: unknown): HighSchoolGradeLevel | null {
  return isHighSchoolGradeLevel(value) ? value : null
}

export function normalizeStudentSchoolGradeLevel(value: unknown): StudentSchoolGradeLevel | null {
  return normalizeGradeLevel(value) ?? normalizeHighSchoolGradeLevel(value)
}
