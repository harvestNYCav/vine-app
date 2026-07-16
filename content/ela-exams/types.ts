import type { GradeLevel } from '@/lib/grade-levels'

export type ElaExamChoice = 'A' | 'B' | 'C' | 'D'
export type ElaExamQuestionNumberKind = 'official' | 'release-ordinal'
export type ElaStandardsFramework = 'CCLS' | 'NGLS'

export type ElaSkill =
  | 'key-ideas-details'
  | 'craft-structure'
  | 'integration-knowledge'
  | 'language-vocabulary'

export interface ElaQuestionImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface ElaPassageReference {
  label: string
  sourceUrl: string
  /** First physical PDF page, counted from 1. */
  pageStart: number
  /** Last physical PDF page, counted from 1 and inclusive. */
  pageEnd: number
}

export interface ElaChoiceGrading {
  mode: 'choice'
  correct: ElaExamChoice
  explanation: string
}

export interface ElaExamQuestionRecord {
  id: string
  examId: string
  sectionSlug: string
  stimulusId: string
  number: number
  numberKind: ElaExamQuestionNumberKind
  session: 1 | 2 | null
  sourcePage: number
  type: 'multiple-choice'
  points: 1
  primaryStandard: string
  secondaryStandards?: string[]
  skill: ElaSkill
  image: ElaQuestionImage
  grading: ElaChoiceGrading
}

export type PublicElaExamQuestion = Omit<ElaExamQuestionRecord, 'grading'>

export interface ElaWorkedExample {
  prompt: string
  steps: string[]
  takeaway: string
}

export interface ElaExamSectionDefinition {
  slug: string
  stimulusId: string
  passageLabel: string
  questionStart: number
  questionEnd: number
  passageReferences: ElaPassageReference[]
  focusSkill: ElaSkill
  skills: ElaSkill[]
  standards: string[]
  emoji: string
  title: string
  description: string
  overview: string
  learningGoals: string[]
  strategy: string
  workedExample: ElaWorkedExample
  questionIds: string[]
}

export interface ElaExamDefinition {
  id: string
  slug: string
  year: number
  grade: GradeLevel
  standardsFramework: ElaStandardsFramework
  title: string
  description: string
  sourceTitle: string
  sourceUrl: string
  accessedAt: string
  sections: ElaExamSectionDefinition[]
}
