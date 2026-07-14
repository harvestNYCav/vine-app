import { GRADE_3_2026_EXAM } from './2026-grade-3/exam'

export const MATH_EXAMS = [GRADE_3_2026_EXAM]

export function getMathExamBySlug(slug: string) {
  return MATH_EXAMS.find(exam => exam.slug === slug)
}

export function getMathExamById(id: string) {
  return MATH_EXAMS.find(exam => exam.id === id)
}
