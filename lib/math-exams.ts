import { getMathExamById } from '@/content/math-exams'
import { BASE_TEN_QUESTIONS } from '@/content/math-exams/2026-grade-3/base-ten'
import { FRACTIONS_QUESTIONS } from '@/content/math-exams/2026-grade-3/fractions'
import { GEOMETRY_QUESTIONS } from '@/content/math-exams/2026-grade-3/geometry'
import { MEASUREMENT_DATA_QUESTIONS } from '@/content/math-exams/2026-grade-3/measurement-data'
import { OPERATIONS_ALGEBRA_QUESTIONS } from '@/content/math-exams/2026-grade-3/operations-algebra'
import type {
  MathExamLanguage,
  MathExamQuestionRecord,
  PublicMathExamQuestion,
} from '@/content/math-exams/types'

const QUESTION_RECORDS: MathExamQuestionRecord[] = [
  ...OPERATIONS_ALGEBRA_QUESTIONS,
  ...MEASUREMENT_DATA_QUESTIONS,
  ...FRACTIONS_QUESTIONS,
  ...BASE_TEN_QUESTIONS,
  ...GEOMETRY_QUESTIONS,
]

const QUESTIONS_BY_ID = new Map(QUESTION_RECORDS.map(question => [question.id, question]))

export function getMathExamQuestion(id: string) {
  return QUESTIONS_BY_ID.get(id)
}

export function getMathExamSection(examId: string, sectionSlug: string) {
  const exam = getMathExamById(examId)
  if (!exam) return null
  const section = exam.sections.find(item => item.slug === sectionSlug)
  return section ? { exam, section } : null
}

export function getMathExamSectionQuestions(examId: string, sectionSlug: string) {
  const match = getMathExamSection(examId, sectionSlug)
  if (!match) return []
  return match.section.questionIds.flatMap(id => {
    const question = QUESTIONS_BY_ID.get(id)
    return question && question.examId === examId && question.sectionSlug === sectionSlug
      ? [question]
      : []
  })
}

export function toPublicMathExamQuestion(question: MathExamQuestionRecord): PublicMathExamQuestion {
  const { grading: _grading, ...publicQuestion } = question
  return publicQuestion
}

export function localized(value: { en: string; es: string }, language: MathExamLanguage) {
  return value[language]
}

export function normalizeMathAnswer(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[,$]/g, '')
    .replace(/\s+/g, '')
    .replace(/[.]+$/, '')
}
