export type Role = 'student' | 'tutor' | 'admin' | 'parent'
export type Track = 'ela' | 'esl' | 'math'
export type GradeLevel = 3 | 4 | 5 | 6 | 7 | 8

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
  es?: string
  exampleEn: string
  exampleEs?: string
}

export type QuestionType = 'multiple-choice' | 'fill-in-the-blank'

export interface QuizQuestion {
  id: string
  type: QuestionType
  promptEn: string
  promptEs?: string
  answer: string
  options?: string[]
}

export interface DialogueLine {
  speaker: 'tutor' | 'student'
  en: string
  es?: string
}

export interface WordBankItem {
  en: string
  es?: string
}

export interface TeachingScenario {
  label: string
  text: string
  wordBank?: WordBankItem[]
  script?: DialogueLine[]
  chunks?: DialogueLine[][]
}

export interface FillInBlankItem {
  id: string
  promptEn: string
  promptEs?: string
  answer: string
}

export interface GrammarExample {
  en: string
  es?: string
}

export interface GrammarPoint {
  titleEn: string
  titleEs?: string
  explanationEn: string
  explanationEs?: string
  examples: GrammarExample[]
}

export interface PracticeActivity {
  titleEn: string
  titleEs?: string
  instructionsEn: string
  instructionsEs?: string
  wordBank?: WordBankItem[]
  chunks?: DialogueLine[][]
}

export interface Module {
  slug: string
  track: Exclude<Track, 'math'>
  titleEn: string
  titleEs?: string
  descriptionEn: string
  descriptionEs?: string
  icon: string
  vocab: VocabItem[]
  grammar?: GrammarPoint[]
  quiz: QuizQuestion[]
  teachingScenarios: TeachingScenario[]
  practiceActivities?: PracticeActivity[]
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
