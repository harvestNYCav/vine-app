import assert from 'node:assert/strict'
import test from 'node:test'
import type { RegentsCourse, RegentsExam, RegentsQuestion, RegentsSection } from '../content/regents/types'
import { assignedRegentsSectionKeys } from '../lib/regents-progress'

function question(id: string, sectionSlug: string, readiness: 'reviewed' | 'needs-review'): RegentsQuestion {
  return {
    id,
    number: 1,
    sectionSlug,
    sourcePage: 1,
    prompt: 'What is the best answer?',
    choices: [
      { label: '1', text: 'First' },
      { label: '2', text: 'Second' },
      { label: '3', text: 'Third' },
      { label: '4', text: 'Fourth' },
    ],
    correct: '1',
    explanation: 'The first choice follows from the information in the question.',
    explanationSource: 'vine-authored',
    readiness,
  }
}

function section(slug: string, questionId: string, transcriptReviewed = true): RegentsSection {
  return {
    slug,
    title: slug,
    questionIds: [questionId],
    passage: {
      title: 'Example passage',
      credit: 'Example source',
      transcriptReviewStatus: transcriptReviewed ? 'reviewed' : 'needs-review',
      lines: [{ number: 1, text: 'A line of passage text.' }],
    },
  }
}

function exam(course: RegentsCourse, slug: string, sections: RegentsSection[], questions: RegentsQuestion[]): RegentsExam {
  return {
    id: slug,
    slug,
    course,
    year: 2026,
    administration: 'june',
    standardsEra: 'NGLS',
    sourceUrl: 'https://www.nysedregents.org/example-exam.pdf',
    answerKeyUrl: 'https://www.nysedregents.org/example-key.pdf',
    sections,
    questions,
  }
}

const algebraExam = exam('algebra-i', 'algebra-example', [
  section('reviewed', 'algebra-ready'),
  section('pending', 'algebra-pending'),
], [
  question('algebra-ready', 'reviewed', 'reviewed'),
  question('algebra-pending', 'pending', 'needs-review'),
])

const englishExam = exam('english', 'english-example', [
  section('reviewed-passage', 'english-ready'),
  section('pending-passage', 'english-pending', false),
], [
  question('english-ready', 'reviewed-passage', 'reviewed'),
  question('english-pending', 'pending-passage', 'reviewed'),
])

const examsForCourse = (course: RegentsCourse): RegentsExam[] =>
  course === 'algebra-i' ? [algebraExam] : course === 'english' ? [englishExam] : []

test('Regents progress includes assigned reviewed Math sections, not pending or unassigned courses', () => {
  const keys = assignedRegentsSectionKeys(
    ['algebra-i', 'english'], ['math', 'ela'], 11, 'math', examsForCourse,
  )
  assert.deepEqual([...keys], ['algebra-example:reviewed'])
  assert.equal(keys.has('algebra-example:pending'), false)
  assert.equal(keys.has('english-example:reviewed-passage'), false)
  assert.deepEqual([...assignedRegentsSectionKeys(['geometry'], ['math'], 11, 'math', examsForCourse)], [])
})

test('Regents ELA progress requires a reviewed in-app passage', () => {
  const keys = assignedRegentsSectionKeys(['english'], ['ela'], 12, 'ela', examsForCourse)
  assert.deepEqual([...keys], ['english-example:reviewed-passage'])
  assert.equal(keys.has('english-example:pending-passage'), false)
})

test('Regents progress is hidden without high-school placement or the subject track', () => {
  assert.equal(assignedRegentsSectionKeys(['algebra-i'], ['math'], null, 'math', examsForCourse).size, 0)
  assert.equal(assignedRegentsSectionKeys(['algebra-i'], ['ela'], 10, 'math', examsForCourse).size, 0)
  assert.equal(assignedRegentsSectionKeys(['english'], ['math'], 10, 'ela', examsForCourse).size, 0)
})
