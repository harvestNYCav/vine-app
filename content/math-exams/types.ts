export type MathExamLanguage = 'en' | 'es'

export type MathExamQuestionType =
  | 'multiple-choice'
  | 'short-answer'
  | 'constructed-response'

export type MathExamChoice = 'A' | 'B' | 'C' | 'D'

export interface LocalizedText {
  en: string
  es: string
}

export interface MathExamQuestionImageVariant {
  src: string
  width: number
  height: number
}

export interface MathExamQuestionImage {
  en: MathExamQuestionImageVariant
  es: MathExamQuestionImageVariant
  alt: LocalizedText
}

interface BaseGrading {
  explanation: LocalizedText
}

export interface ChoiceGrading extends BaseGrading {
  mode: 'choice'
  correct: MathExamChoice
}

export interface ExactGrading extends BaseGrading {
  mode: 'exact'
  acceptedAnswers: string[]
}

export interface SelfAssessedGrading extends BaseGrading {
  mode: 'self-assessed'
  criteria: LocalizedText[]
}

export type MathExamGrading = ChoiceGrading | ExactGrading | SelfAssessedGrading

export interface MathExamQuestionRecord {
  id: string
  examId: string
  sectionSlug: string
  number: number
  session: 1 | 2
  sourcePage: number
  type: MathExamQuestionType
  points: 1 | 2 | 3
  primaryStandard: string
  secondaryStandards?: string[]
  cluster: string
  image: MathExamQuestionImage
  grading: MathExamGrading
}

export type PublicMathExamQuestion = Omit<MathExamQuestionRecord, 'grading'>

export interface MathExamWorkedExample {
  prompt: LocalizedText
  steps: LocalizedText[]
  answer: LocalizedText
}

export interface MathExamSectionDefinition {
  slug: string
  emoji: string
  title: LocalizedText
  description: LocalizedText
  overview: LocalizedText
  learningGoals: LocalizedText[]
  strategy: LocalizedText
  workedExample: MathExamWorkedExample
  questionIds: string[]
}

export interface MathExamDefinition {
  id: string
  slug: string
  year: number
  grade: number
  standardsFramework: 'CCLS' | 'NGLS'
  title: LocalizedText
  description: LocalizedText
  sourceTitle: LocalizedText
  sourceUrl: LocalizedText
  accessedAt: string
  sections: MathExamSectionDefinition[]
}
