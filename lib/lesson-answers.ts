import type { Module } from '@/types'
import { getMatchingItems } from '@/lib/worksheet'

export type AnswerSection = 'quiz' | 'matching' | 'fill-in'

// One graded item from a Quick Check or Homework submission. The prompt and expected answer are
// stored with the student's answer so a saved result still reads correctly if lesson content changes.
export type AnswerResult = {
  section: AnswerSection
  id: string
  prompt: string
  answer: string
  expected: string
  correct: boolean
}

function answerFor(answers: Map<string, unknown>, id: string) {
  return String(answers.get(id) ?? '')
}

// Each contraction and its full form are the same answer. Ambiguous ones ('s, 'd) are left out,
// since "Maria's" is a possessive and "I'd" can mean "I had" or "I would".
const CONTRACTIONS: [RegExp, string][] = Object.entries({
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "can't": 'cannot',
  "won't": 'will not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "couldn't": 'could not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "i'm": 'i am',
  "you're": 'you are',
  "we're": 'we are',
  "they're": 'they are',
}).map(([short, long]) => [new RegExp(`(?<![\\w'])${short}(?![\\w'])`, 'g'), long])

// Phone keyboards type curly apostrophes (’), so they count as straight ones. Beginners often drop
// the apostrophe in "o'clock" altogether.
export function normalizeAnswer(text: string) {
  let normalized = text.trim().toLowerCase().replace(/[‘’ʼ`´]/g, "'").replace(/\s+/g, ' ')
  for (const [short, long] of CONTRACTIONS) normalized = normalized.replace(short, long)
  return normalized.replace(/\bcan not\b/g, 'cannot').replace(/\bo ?clock\b/g, "o'clock")
}

function isAcceptedAnswer(answer: string, expected: string, acceptedAnswers: string[] = []) {
  const normalized = normalizeAnswer(answer)
  return [expected, ...acceptedAnswers].some(option => normalizeAnswer(option) === normalized)
}

export function gradeQuiz(mod: Module, answerByQuestionId: Map<string, unknown>): AnswerResult[] {
  return mod.quiz.map(question => {
    const answer = answerFor(answerByQuestionId, question.id)
    return {
      section: 'quiz',
      id: question.id,
      prompt: question.promptEn,
      answer,
      expected: question.answer,
      correct: answer === question.answer,
    }
  })
}

export function gradeHomework(
  mod: Module,
  matchingByVocabId: Map<string, unknown>,
  fillInByQuestionId: Map<string, unknown>,
): AnswerResult[] {
  const matching: AnswerResult[] = getMatchingItems(mod).map(vocab => {
    const answer = answerFor(matchingByVocabId, vocab.id)
    return {
      section: 'matching',
      id: vocab.id,
      prompt: vocab.en,
      answer,
      expected: vocab.es ?? '',
      correct: answer === vocab.es,
    }
  })
  const fillIn: AnswerResult[] = mod.worksheet.map(question => {
    const answer = answerFor(fillInByQuestionId, question.id)
    return {
      section: 'fill-in',
      id: question.id,
      prompt: question.promptEn,
      answer,
      expected: question.answer,
      correct: isAcceptedAnswer(answer, question.answer, question.acceptedAnswers),
    }
  })
  return [...matching, ...fillIn]
}

export function scoreAnswers(results: AnswerResult[]) {
  if (results.length === 0) return 0
  return Math.round((results.filter(result => result.correct).length / results.length) * 100)
}

const SECTIONS = new Set<AnswerSection>(['quiz', 'matching', 'fill-in'])

function isAnswerResult(value: unknown): value is AnswerResult {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<AnswerResult>
  return SECTIONS.has(item.section as AnswerSection)
    && typeof item.id === 'string'
    && typeof item.prompt === 'string'
    && typeof item.answer === 'string'
    && typeof item.expected === 'string'
    && typeof item.correct === 'boolean'
}

// Validates graded answers that arrived as untyped data (an API response or parsed JSON).
export function toAnswerResults(value: unknown): AnswerResult[] {
  return Array.isArray(value) && value.every(isAnswerResult) ? value : []
}

// Reads a stored answers column. Rows saved before answers were recorded hold NULL, so callers get
// an empty list and simply show no breakdown.
export function parseAnswerResults(value: unknown): AnswerResult[] {
  if (typeof value !== 'string' || value === '') return []
  try {
    return toAnswerResults(JSON.parse(value))
  } catch {
    return []
  }
}
