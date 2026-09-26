import { getElaExamById, getElaExamsForGrade } from '@/content/ela-exams'
import { getMathExamById, getMathExamsForGrade } from '@/content/math-exams'
import type { GradeLevel } from '@/lib/grade-levels'
import type { ExamSectionRef } from '@/lib/exam-assignments'

export interface ExamSectionInfo extends ExamSectionRef {
  grade: GradeLevel
  year: number
  emoji: string
  title: string
  // Math sections have Spanish titles; used when the student is in Spanish mode.
  titleEs?: string
  supportsSpanish: boolean
  subjectLabel: string
  href: string
}

// Looks up an assigned section in the exam catalogs. Returns null for a section that no longer
// exists (e.g. content was regenerated), so callers can skip it.
export function describeExamSection(ref: ExamSectionRef): ExamSectionInfo | null {
  if (ref.subject === 'math') {
    const exam = getMathExamById(ref.examId)
    const section = exam?.sections.find(item => item.slug === ref.sectionSlug)
    if (!exam || !section) return null
    return {
      ...ref,
      grade: exam.grade,
      year: exam.year,
      emoji: section.emoji,
      title: section.title.en,
      titleEs: section.title.es,
      supportsSpanish: exam.supportedLanguages.includes('es'),
      subjectLabel: 'Math',
      href: `/math/exams/${exam.slug}/${section.slug}`,
    }
  }
  const exam = getElaExamById(ref.examId)
  const section = exam?.sections.find(item => item.slug === ref.sectionSlug)
  if (!exam || !section) return null
  return {
    ...ref,
    grade: exam.grade,
    year: exam.year,
    emoji: section.emoji,
    title: section.title,
    supportsSpanish: false,
    subjectLabel: 'ELA',
    href: `/ela/exams/${exam.slug}/${section.slug}`,
  }
}

export function examSectionIsForGrade(ref: ExamSectionRef, grade: GradeLevel | null) {
  const exams = ref.subject === 'math' ? getMathExamsForGrade(grade) : getElaExamsForGrade(grade)
  return exams.some(exam => exam.id === ref.examId && exam.sections.some(section => section.slug === ref.sectionSlug))
}
