import assert from 'node:assert/strict'
import test from 'node:test'
import type { Module } from '../types'
import { gradeHomework, gradeQuiz, normalizeAnswer, parseAnswerResults, scoreAnswers, toAnswerResults } from '../lib/lesson-answers'

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

// Homework items copied from the ESL lessons where the eval found correct answers marked wrong.
const homework = {
  slug: 'homework-examples',
  track: 'esl',
  vocab: [],
  quiz: [],
  worksheet: [
    { id: 'negation-w1', promptEn: 'I ____ have a car.', answer: "don't" },
    { id: 'negation-w2', promptEn: 'She ____ speak English yet.', answer: "doesn't" },
    { id: 'negation-w3', promptEn: 'I ____ go to the doctor yesterday.', answer: "didn't" },
    { id: 'negation-w5', promptEn: 'I ____ come to work tomorrow.', answer: "can't" },
    { id: 'time-w2', promptEn: 'It is three ____.', answer: "o'clock" },
    { id: 'questions-w4', promptEn: '____ you help me?', answer: 'Can', acceptedAnswers: ['Could'] },
    { id: 'essentials-w2', promptEn: 'Where is the ____?', answer: 'bathroom', acceptedAnswers: ['restroom'] },
    { id: 'dining-w3', promptEn: 'Can I have the ____, please?', answer: 'check', acceptedAnswers: ['bill'] },
    { id: 'family-w3', promptEn: 'How many ____ do you have?', answer: 'children', acceptedAnswers: ['kids'] },
    { id: 'gerunds-w1', promptEn: 'I like ____.', answer: 'cooking', acceptedAnswers: ['to cook'] },
    { id: 'groceries-w5', promptEn: 'Can I ____ a receipt, please?', answer: 'have', acceptedAnswers: ['get'] },
    { id: 'subway-w3', promptEn: 'Turn ____ at the corner, then go straight.', answer: 'left', acceptedAnswers: ['right'] },
  ],
} as unknown as Module

function gradeFillIn(answers: Record<string, string>) {
  const results = gradeHomework(homework, new Map(), new Map(Object.entries(answers)))
  return Object.fromEntries(results.filter(r => r.section === 'fill-in' && r.id in answers).map(r => [r.id, r.correct]))
}

test('fill-ins accept a contraction or its full form, with straight or curly apostrophes', () => {
  assert.deepEqual(gradeFillIn({
    'negation-w1': 'do not',
    'negation-w2': 'Does Not',
    'negation-w3': 'didn’t',
    'negation-w5': 'cannot',
    'time-w2': 'o’clock',
  }), {
    'negation-w1': true,
    'negation-w2': true,
    'negation-w3': true,
    'negation-w5': true,
    'time-w2': true,
  })
  assert.deepEqual(gradeFillIn({ 'negation-w1': 'don’t', 'negation-w5': 'can not', 'time-w2': 'oclock' }), {
    'negation-w1': true,
    'negation-w5': true,
    'time-w2': true,
  })
})

test('fill-ins still reject a different word, even a correct-looking negative', () => {
  assert.deepEqual(gradeFillIn({ 'negation-w1': 'did not', 'negation-w2': 'do not', 'negation-w5': "won't" }), {
    'negation-w1': false,
    'negation-w2': false,
    'negation-w5': false,
  })
})

test('fill-ins accept every listed answer, and the result keeps the main answer as expected', () => {
  const answers = {
    'questions-w4': 'Could',
    'essentials-w2': 'restroom',
    'dining-w3': 'bill',
    'family-w3': 'kids',
    'gerunds-w1': 'to cook',
    'groceries-w5': 'get',
    'subway-w3': 'right',
  }
  assert.deepEqual(gradeFillIn(answers), Object.fromEntries(Object.keys(answers).map(id => [id, true])))

  const [result] = gradeHomework(homework, new Map(), new Map([['dining-w3', 'bill']])).filter(r => r.id === 'dining-w3')
  assert.equal(result.expected, 'check')
  assert.equal(gradeFillIn({ 'dining-w3': 'menu' })['dining-w3'], false)
})

test('contractions are matched as whole words only', () => {
  assert.equal(normalizeAnswer("  I'm   tired "), 'i am tired')
  assert.equal(normalizeAnswer("Maria's"), "maria's")
  assert.equal(normalizeAnswer("o'clock"), "o'clock")
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
