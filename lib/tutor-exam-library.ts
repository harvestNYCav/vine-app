import 'server-only'

import { getElaExamsForGrade } from '@/content/ela-exams'
import { getMathExamsForGrade } from '@/content/math-exams'
import { normalizeGradeLevel } from '@/lib/grade-levels'

export interface TutorExamLibraryFilters {
  subject?: string | string[]
  grade?: string | string[]
  year?: string | string[]
}

export function getTutorExamLibrary(filters: TutorExamLibraryFilters) {
  const subject = filters.subject === 'math' ? 'math' : 'ela'
  const grade = normalizeGradeLevel(typeof filters.grade === 'string' ? Number(filters.grade) : null) ?? 3
  const exams = subject === 'math' ? getMathExamsForGrade(grade) : getElaExamsForGrade(grade)
  const years = [...new Set(exams.map(exam => exam.year))].sort((a, b) => b - a)
  const requestedYear = typeof filters.year === 'string' ? Number(filters.year) : NaN
  const year = filters.year === 'all' ? 'all' : years.includes(requestedYear) ? requestedYear : years[0]

  return {
    subject,
    grade,
    year,
    years,
    exams: exams.filter(exam => year === 'all' || exam.year === year).map(exam => ({
      id: exam.id,
      year: exam.year,
      title: typeof exam.title === 'string' ? exam.title : exam.title.en,
      sections: exam.sections.map(section => ({
        slug: section.slug,
        emoji: section.emoji,
        title: typeof section.title === 'string' ? section.title : section.title.en,
        questionCount: section.questionIds.length,
        href: `/tutor/exams/${subject}/${exam.slug}/${section.slug}`,
      })),
    })),
  }
}
