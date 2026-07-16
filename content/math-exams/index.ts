import type { GradeLevel } from '@/lib/grade-levels'
import { MATH_EXAMS } from './catalog-runtime'

export { MATH_EXAMS }

export function getMathExamsForGrade(grade: GradeLevel | null) {
  if (grade === null) return []
  return MATH_EXAMS.filter(exam => exam.grade === grade)
}

export function getMathExamBySlug(slug: string) {
  return MATH_EXAMS.find(exam => exam.slug === slug)
}

export function getMathExamById(id: string) {
  return MATH_EXAMS.find(exam => exam.id === id)
}
