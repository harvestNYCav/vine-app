import { getElaExamById } from '@/content/ela-exams'
import { ELA_EXAM_QUESTIONS } from '@/content/ela-exams/catalog-runtime'
import type {
  ElaExamQuestionRecord,
  PublicElaExamQuestion,
} from '@/content/ela-exams/types'

const QUESTION_RECORDS: ElaExamQuestionRecord[] = ELA_EXAM_QUESTIONS
const QUESTIONS_BY_ID = new Map(QUESTION_RECORDS.map(question => [question.id, question]))

export function getElaExamQuestion(id: string) {
  return QUESTIONS_BY_ID.get(id)
}

export function getElaExamSection(examId: string, sectionSlug: string) {
  const exam = getElaExamById(examId)
  if (!exam) return null
  const section = exam.sections.find(item => item.slug === sectionSlug)
  return section ? { exam, section } : null
}

export function getElaExamSectionQuestions(examId: string, sectionSlug: string) {
  const match = getElaExamSection(examId, sectionSlug)
  if (!match) return []
  return match.section.questionIds.flatMap(id => {
    const question = QUESTIONS_BY_ID.get(id)
    return question
      && question.examId === examId
      && question.sectionSlug === sectionSlug
      && question.stimulusId === match.section.stimulusId
      ? [question]
      : []
  })
}

export function toPublicElaExamQuestion(question: ElaExamQuestionRecord): PublicElaExamQuestion {
  const { grading: _grading, ...publicQuestion } = question
  return publicQuestion
}
