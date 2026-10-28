export type RegentsCourse = 'algebra-i' | 'geometry' | 'algebra-ii' | 'english'
export type RegentsAdministration = 'january' | 'june' | 'august'
export type RegentsChoice = '1' | '2' | '3' | '4'
export type RegentsReadiness = 'reviewed' | 'needs-review'

export interface RegentsPassageLine {
  number: number | null
  text: string
}

export interface RegentsPassage {
  title: string
  credit: string
  lines: RegentsPassageLine[]
  transcriptReviewStatus: RegentsReadiness
}

export interface RegentsSection {
  slug: string
  title: string
  intro?: string
  questionIds: string[]
  passage?: RegentsPassage
}

export interface RegentsQuestionImage {
  src: string
  width: number
  height: number
  alt: string
}

export interface RegentsQuestion {
  id: string
  number: number
  sectionSlug: string
  sourcePage: number
  prompt: string
  choices: { label: RegentsChoice; text: string }[]
  correct: RegentsChoice
  explanation: string
  explanationSource: 'official-nysed' | 'vine-authored' | 'pending-review'
  readiness: RegentsReadiness
  reviewNote?: string
  image?: RegentsQuestionImage
}

export type PublicRegentsQuestion = Omit<RegentsQuestion, 'correct' | 'explanation' | 'explanationSource' | 'readiness' | 'reviewNote'>

export interface RegentsExam {
  id: string
  slug: string
  course: RegentsCourse
  year: number
  administration: RegentsAdministration
  standardsEra: 'CCLS' | 'NGLS'
  sourceUrl: string
  sourceIndexUrl?: string
  sourceSha256?: string
  accessedAt?: string
  answerKeyUrl: string
  excludedQuestions?: { number: number; reason: string }[]
  sections: RegentsSection[]
  questions: RegentsQuestion[]
}
