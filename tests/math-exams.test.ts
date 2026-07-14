import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GRADE_3_2026_EXAM } from '../content/math-exams/2026-grade-3/exam'
import { BASE_TEN_QUESTIONS } from '../content/math-exams/2026-grade-3/base-ten'
import { FRACTIONS_QUESTIONS } from '../content/math-exams/2026-grade-3/fractions'
import { GEOMETRY_QUESTIONS } from '../content/math-exams/2026-grade-3/geometry'
import { MEASUREMENT_DATA_QUESTIONS } from '../content/math-exams/2026-grade-3/measurement-data'
import { OPERATIONS_ALGEBRA_QUESTIONS } from '../content/math-exams/2026-grade-3/operations-algebra'
import { normalizeMathAnswer, toPublicMathExamQuestion } from '../lib/math-exams'

const root = process.cwd()
const questions = [
  ...OPERATIONS_ALGEBRA_QUESTIONS,
  ...MEASUREMENT_DATA_QUESTIONS,
  ...FRACTIONS_QUESTIONS,
  ...BASE_TEN_QUESTIONS,
  ...GEOMETRY_QUESTIONS,
]

test('2026 Grade 3 catalog covers all 33 released questions exactly once', () => {
  assert.match(GRADE_3_2026_EXAM.accessedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(questions.length, 33)
  assert.equal(new Set(questions.map(question => question.id)).size, 33)
  assert.equal(new Set(questions.map(question => question.number)).size, 33)

  const catalogIds = GRADE_3_2026_EXAM.sections.flatMap(section => section.questionIds)
  assert.deepEqual(new Set(catalogIds), new Set(questions.map(question => question.id)))
})

test('every exam question has reviewed bilingual assets and accessible metadata', () => {
  for (const question of questions) {
    assert.equal(question.examId, GRADE_3_2026_EXAM.id)
    assert.ok(question.sourcePage > 0, `${question.id} should have a PDF page`)
    assert.ok(question.primaryStandard.startsWith('NGLS.Math.Content.NY-3.'))
    assert.ok(question.image.en.width > 0 && question.image.en.height > 0)
    assert.ok(question.image.es.width > 0 && question.image.es.height > 0)
    assert.ok(question.image.alt.en.length >= 40, `${question.id} needs English alt text`)
    assert.ok(question.image.alt.es.length >= 40, `${question.id} needs Spanish alt text`)
    assert.ok(question.grading.explanation.en.length >= 20, `${question.id} needs English feedback`)
    assert.ok(question.grading.explanation.es.length >= 20, `${question.id} needs Spanish feedback`)

    for (const path of [question.image.en.src, question.image.es.src]) {
      assert.ok(path.startsWith('/vine-app/nysed/'))
      const localPath = join(root, 'public', path.replace('/vine-app/', ''))
      assert.ok(existsSync(localPath), `${localPath} should exist`)
      assert.ok(statSync(localPath).size > 1000, `${localPath} should not be empty`)
    }

    if (question.type === 'multiple-choice') {
      assert.equal(question.grading.mode, 'choice')
    } else if (question.type === 'short-answer') {
      assert.equal(question.grading.mode, 'exact')
      if (question.grading.mode === 'exact') assert.ok(question.grading.acceptedAnswers.length > 0)
    } else {
      assert.equal(question.grading.mode, 'self-assessed')
      if (question.grading.mode === 'self-assessed') {
        assert.ok(question.grading.criteria.length >= question.points)
      }
    }

    const publicQuestion = toPublicMathExamQuestion(question)
    assert.ok(!('grading' in publicQuestion), `${question.id} must not expose its answer key`)
  }
})

test('answer normalization accepts harmless formatting differences', () => {
  assert.equal(normalizeMathAnswer(' $1,234. '), '1234')
  assert.equal(normalizeMathAnswer(' 1 / 2 '), '1/2')
})
