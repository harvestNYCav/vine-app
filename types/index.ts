export type Role = 'student' | 'tutor' | 'admin'
export type Track = 'ela' | 'esl' | 'math'

export interface User {
  id: string
  name: string
  email: string | null
  role: Role
  createdAt: number
  lastActive: number
}

export interface VocabItem {
  id: string
  en: string
  es: string
  exampleEn: string
  exampleEs: string
}

export type QuestionType = 'multiple-choice' | 'fill-in-the-blank'

export interface QuizQuestion {
  id: string
  type: QuestionType
  promptEn: string
  promptEs: string
  answer: string
  options?: string[]
}

export interface TeachingScenario {
  label: string
  text: string
}

export interface FillInBlankItem {
  id: string
  promptEn: string
  promptEs: string
  answer: string
}

export interface Module {
  slug: string
  track: Exclude<Track, 'math'>
  titleEn: string
  titleEs: string
  descriptionEn: string
  descriptionEs: string
  icon: string
  vocab: VocabItem[]
  quiz: QuizQuestion[]
  teachingScenarios: TeachingScenario[]
  worksheet: FillInBlankItem[]
}

export interface VocabProgress {
  userId: string
  wordId: string
  moduleSlug: string
  interval: number
  repetitions: number
  nextReviewAt: number
  correctCount: number
  incorrectCount: number
}

export interface ModuleProgress {
  userId: string
  moduleSlug: string
  vocabViewedAt: number | null
  practiceCompletedAt: number | null
  practiceScore: number | null
  teachSessionCount: number
  homeworkCompletedAt: number | null
  homeworkScore: number | null
}

export interface TeachingSession {
  id: string
  userId: string
  moduleSlug: string
  startedAt: number
  endedAt: number | null
  messageCount: number
  phrasesTaught: string[]
  encouragement: string
  transcript: ChatMessage[]
}

export interface ActivityLog {
  userId: string
  date: string
  activityType: 'practice' | 'module' | 'teach'
  count: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Session {
  id: string
  date: string
  moduleSlug: string
  tutorId: string
  homeworkAssigned: boolean
  createdAt: number
}

export interface AttendanceRecord {
  sessionDate: string
  studentId: string
  present: boolean
}
