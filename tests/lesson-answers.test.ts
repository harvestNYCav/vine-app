import assert from 'node:assert/strict'
import test from 'node:test'
import type { Module } from '../types'
import { gradeHomework, gradeQuiz, parseAnswerResults, scoreAnswers, toAnswerResults } from '../lib/lesson-answers'

const mod = {
  slug: 'greetings',
  track: 'esl',
  vocab: [
    { id: 'hello', en: 'hello', es: 'hola', exampleEn: '' },
    { id: 'bye', en: 'goodbye', es: 'adiós', exampleEn: '' },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Yo" in English is:', answer: 'I', options: ['I', 'you'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Greet someone', answer: 'Hello', options: ['Hello', 'Goodbye'] },
  ],
  worksheet: [
    { id: 'w1', promptEn: '___ are you?', answer: 'How' },
  ],
} as unknown as Module

test('quiz grading records each answer against the expected one', () => {
  const results = gradeQuiz(mod, new Map([['q1', 'I'], ['q2', 'Goodbye']]))

  assert.deepEqual(results, [
    { section: 'quiz', id: 'q1', prompt: '"Yo" in English is:', answer: 'I', expected: 'I', correct: true },
    { section: 'quiz', id: 'q2', prompt: 'Greet someone', answer: 'Goodbye', expected: 'Hello', correct: false },
  ])
  assert.equal(scoreAnswers(results), 50)
})

test('homework grading covers matching then fill-in, ignoring case and spacing on fill-ins', () => {
  const results = gradeHomework(
    mod,
    new Map([['hello', 'hola'], ['bye', 'hola']]),
    new Map([['w1', '  how ']]),
  )

  assert.deepEqual(results.map(result => [result.section, result.id, result.correct]), [
    ['matching', 'hello', true],
    ['matching', 'bye', false],
    ['fill-in', 'w1', true],
  ])
  assert.equal(results[1].expected, 'adiós')
  assert.equal(scoreAnswers(results), 67)
})

test('unanswered items are graded wrong with a blank answer', () => {
  const [result] = gradeQuiz(mod, new Map())
  assert.equal(result.answer, '')
  assert.equal(result.correct, false)
})

test('stored answers round-trip, and missing or malformed data reads as no breakdown', () => {
  const results = gradeQuiz(mod, new Map([['q1', 'I'], ['q2', 'Hello']]))

  assert.deepEqual(parseAnswerResults(JSON.stringify(results)), results)
  assert.deepEqual(parseAnswerResults(null), [])
  assert.deepEqual(parseAnswerResults('not json'), [])
  assert.deepEqual(parseAnswerResults(JSON.stringify([{ id: 'q1' }])), [])
  assert.deepEqual(toAnswerResults(undefined), [])
  assert.equal(scoreAnswers([]), 0)
})
