import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RegentsPassage from '../components/regents/RegentsPassage'
import type { RegentsExam } from '../content/regents/types'

const catalog: RegentsExam[] = JSON.parse(fs.readFileSync('content/regents/ela/generated/catalog.json', 'utf8'))
const starts: Record<string, number[]> = JSON.parse(fs.readFileSync('tests/fixtures/regents-paragraph-starts.json', 'utf8'))

test('source-verified paragraph boundaries render as navigable paragraphs', () => {
  for (const [stem, expected] of Object.entries(starts)) {
    const split = stem.lastIndexOf('-')
    const exam = catalog.find(exam => exam.id === `english-${stem.slice(0, split)}`)!
    const section = exam.sections.find(section => section.slug === `passage-${stem.slice(split + 1)}`)!
    const lines = section.passage!.lines
    const actual = lines.filter((line, i) => line.number !== null &&
      (line.number === 1 || !lines[i - 1]?.text.trim())).map(line => line.number)
    assert.deepEqual(actual, expected, stem)
    const html = renderToStaticMarkup(React.createElement(RegentsPassage, { passage: section.passage! }))
    for (const number of expected) {
      assert.match(html, new RegExp(`<p[^>]*data-passage-paragraph[^>]*><span[^>]*><span[^>]*>${number}</span>`), `${stem}: paragraph at line ${number}`)
    }
    assert.equal((html.match(/class="sr-only">Line \d+\./g) ?? []).length,
      lines.filter(line => line.number !== null).length, stem)
  }
})

test('paragraph-referencing questions have boundaries inside the numbered passage', () => {
  for (const exam of catalog) for (const section of exam.sections) {
    if (!exam.questions.some(q => q.sectionSlug === section.slug && /\bparagraphs?\b/i.test(q.prompt))) continue
    const lines = section.passage!.lines
    const first = lines.findIndex(line => line.number !== null)
    const last = lines.findLastIndex(line => line.number !== null)
    assert.ok(lines.slice(first, last).some(line => !line.text.trim()), `${exam.id}/${section.slug}`)
  }
})

test('unreviewed passages stay hidden', () => {
  assert.equal(renderToStaticMarkup(React.createElement(RegentsPassage, {
    passage: { title: 'Pending', credit: '', transcriptReviewStatus: 'needs-review', lines: [{ number: 1, text: 'Not ready' }] },
  })), '')
})
