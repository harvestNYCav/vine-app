import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MathChoiceButtons from '../app/(student)/math/exams/[examSlug]/[sectionSlug]/practice/MathChoiceButtons'
import type { MathExamChoice } from '../content/math-exams/types'

test('the 2016 Grade 4 q24 UI renders only its source-verified A-C labels', () => {
  const rawCatalog = JSON.parse(
    readFileSync('content/math-exams/generated/catalog.json', 'utf8'),
  ) as {
    exams: Array<{
      year: number
      grade: number
      questions: Array<{ number: number; choiceLabels?: MathExamChoice[] }>
    }>
  }
  const question = rawCatalog.exams
    .find(exam => exam.year === 2016 && exam.grade === 4)!
    .questions.find(item => item.number === 24)!

  assert.deepEqual(question.choiceLabels, ['A', 'B', 'C'])
  const markup = renderToStaticMarkup(createElement(MathChoiceButtons, {
    choiceLabels: question.choiceLabels!,
    answer: '',
    disabled: false,
    isSpanish: false,
    onSelect: () => {},
  }))

  assert.equal(markup.match(/<button/g)?.length, 3)
  assert.match(markup, /grid-cols-3/)
  assert.match(markup, /aria-label="Choice A"/)
  assert.match(markup, /aria-label="Choice B"/)
  assert.match(markup, /aria-label="Choice C"/)
  assert.doesNotMatch(markup, /Choice D/)
})
