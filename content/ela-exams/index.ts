import type { GradeLevel } from '@/lib/grade-levels'
import { ELA_EXAMS } from './catalog-runtime'

export { ELA_EXAMS }

export function getElaExamsForGrade(grade: GradeLevel | null) {
  if (grade === null) return []
  return ELA_EXAMS.filter(exam => exam.grade === grade)
}

export function getElaExamBySlug(slug: string) {
  return ELA_EXAMS.find(exam => exam.slug === slug)
}

export function getElaExamById(id: string) {
  return ELA_EXAMS.find(exam => exam.id === id)
}
