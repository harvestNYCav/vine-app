import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CollapsiblePassage from '../app/(student)/ela/exams/CollapsiblePassage'

const catalog = JSON.parse(fs.readFileSync('content/ela-exams/generated/catalog.json', 'utf8'))

test('the legacy numbering note renders only for 2013–2015 passages', () => {
  let passages = 0
  for (const exam of catalog.exams) {
    for (const stimulus of exam.stimuli) {
      const html = renderToStaticMarkup(React.createElement(CollapsiblePassage, {
        passage: stimulus.passage,
        passageLabel: stimulus.title ?? 'Reading passage',
      }))
      assert.equal(html.includes('Original booklet pages may show different question numbers.'),
        exam.year >= 2013 && exam.year <= 2015, stimulus.id)
      assert.ok(!html.includes('“XX”'), stimulus.id)
      assert.ok(html.includes('Accessible text transcript'), stimulus.id)
      passages += 1
    }
  }
  assert.equal(passages, 242)
})
