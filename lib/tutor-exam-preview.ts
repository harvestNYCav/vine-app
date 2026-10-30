import 'server-only'

import { getElaExamBySlug } from '@/content/ela-exams'
import { getMathExamBySlug } from '@/content/math-exams'
import { getElaExamSectionQuestions } from '@/lib/ela-exams'
import { getMathExamSectionQuestions } from '@/lib/math-exams'

// Private answer-bearing content: callers must authorize a tutor before resolving it.
export function getTutorExamPreview(
  subject: string,
  examSlug: string,
  sectionSlug: string,
  requestedLanguage?: string,
) {
  if (subject === 'ela') {
    const exam = getElaExamBySlug(examSlug)
    const section = exam?.sections.find(item => item.slug === sectionSlug)
    if (!exam || !section) return null
    return {
      subject: 'ela' as const,
      exam,
      section,
      questions: getElaExamSectionQuestions(exam.id, section.slug),
      language: 'en' as const,
    }
  }
  if (subject === 'math') {
    const exam = getMathExamBySlug(examSlug)
    const section = exam?.sections.find(item => item.slug === sectionSlug)
    if (!exam || !section) return null
    return {
      subject: 'math' as const,
      exam,
      section,
      questions: getMathExamSectionQuestions(exam.id, section.slug),
      language: requestedLanguage === 'es' && exam.supportedLanguages.includes('es')
        ? 'es' as const
        : 'en' as const,
    }
  }
  return null
}

export type TutorExamPreview = NonNullable<ReturnType<typeof getTutorExamPreview>>
