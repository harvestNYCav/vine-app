import { getMathExamById } from '@/content/math-exams'
import { MATH_EXAM_QUESTIONS } from '@/content/math-exams/catalog-runtime'
import type {
  MathExamLanguage,
  MathExamQuestionRecord,
  PublicMathExamQuestion,
} from '@/content/math-exams/types'

const QUESTION_RECORDS: MathExamQuestionRecord[] = MATH_EXAM_QUESTIONS

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
