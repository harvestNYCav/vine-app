import 'server-only'

import mathCatalog from './math/generated/catalog.json'
import elaCatalog from './ela/generated/catalog.json'
import type {
  RegentsCourse,
  RegentsExam,
  RegentsQuestion,
  RegentsSection,
} from './types'

const ADMINISTRATION_ORDER = { january: 1, june: 2, august: 3 } as const

const exams = [...mathCatalog, ...elaCatalog] as RegentsExam[]
const examById = new Map(exams.map(exam => [exam.id, exam]))

export const REGENTS_COURSE_LABELS: Record<RegentsCourse, string> = {
  'algebra-i': 'Algebra I',
  geometry: 'Geometry',
  'algebra-ii': 'Algebra II',
  english: 'English Language Arts',
}

export function isRegentsCourse(value: string): value is RegentsCourse {
  return Object.hasOwn(REGENTS_COURSE_LABELS, value)
}

export function getRegentsExamsForCourse(course: RegentsCourse): RegentsExam[] {
  return exams
    .filter(exam => exam.course === course)
    .sort((a, b) => b.year - a.year || ADMINISTRATION_ORDER[b.administration] - ADMINISTRATION_ORDER[a.administration])
}

export function getRegentsExamById(id: string): RegentsExam | null {
  return examById.get(id) ?? null
}

export function getRegentsExamBySlug(course: RegentsCourse, slug: string): RegentsExam | null {
  return getRegentsExamsForCourse(course).find(exam => exam.slug === slug) ?? null
}

export function getRegentsSection(exam: RegentsExam, slug: string): RegentsSection | null {
  return exam.sections.find(section => section.slug === slug) ?? null
}

export function getRegentsSectionQuestions(exam: RegentsExam, section: RegentsSection): RegentsQuestion[] {
  const byId = new Map(exam.questions.map(question => [question.id, question]))
  return section.questionIds.flatMap(id => {
    const question = byId.get(id)
    return question && isRegentsQuestionReady(question, section, exam.course) ? [question] : []
  })
}

export function isRegentsQuestionReady(
  question: RegentsQuestion,
  section: RegentsSection,
  course: RegentsCourse,
): boolean {
  if (question.readiness !== 'reviewed' || question.sectionSlug !== section.slug || question.sourcePage < 1) return false
  if (!question.prompt.trim() || !question.explanation.trim() || question.explanationSource === 'pending-review') return false
  if (question.choices.length !== 4 || question.choices.some(choice => !choice.text.trim())) return false
  if (new Set(question.choices.map(choice => choice.label)).size !== 4) return false
  if (question.image && (!question.image.src || !question.image.alt.trim() || question.image.width < 1 || question.image.height < 1)) return false
  if (course === 'english' && (section.passage?.transcriptReviewStatus !== 'reviewed' || !section.passage.lines.length)) return false
  return true
}

export function getRegentsExamReadyCount(exam: RegentsExam): number {
  return exam.sections.reduce((count, section) => count + getRegentsSectionQuestions(exam, section).length, 0)
}

export function regentsAdministrationLabel(exam: RegentsExam): string {
  return `${exam.administration.charAt(0).toUpperCase()}${exam.administration.slice(1)} ${exam.year}`
}
