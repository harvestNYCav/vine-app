import type { MathExamDefinition, MathExamLanguage } from '@/content/math-exams/types'
import type { StudentSettings } from './student-settings'
import type { Track } from '@/types'

export function studentCanAccessMathExam(
  tracks: readonly Track[],
  settings: Pick<StudentSettings, 'gradeLevel' | 'mathSpanishEnabled'>,
  exam: MathExamDefinition,
  language: MathExamLanguage = 'en',
) {
  if (!tracks.includes('math') || settings.gradeLevel !== exam.grade) return false
  if (language === 'es') {
    return settings.mathSpanishEnabled && exam.supportedLanguages.includes('es')
  }
  return true
}
