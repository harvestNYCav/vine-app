import test from 'node:test'
import assert from 'node:assert/strict'
import { getElaExamBySlug } from '../content/ela-exams/index'
import { studentCanAccessElaExam } from '../lib/ela-exam-access'

const grade3Exam = getElaExamBySlug('2026-grade-3-mc')!

test('ELA exam access requires both the ELA track and matching assigned grade', () => {
  const settings = { gradeLevel: 3 as const }
  assert.equal(studentCanAccessElaExam(['ela'], settings, grade3Exam), true)
  assert.equal(studentCanAccessElaExam(['math'], settings, grade3Exam), false)
  assert.equal(studentCanAccessElaExam(['esl'], settings, grade3Exam), false)
  assert.equal(studentCanAccessElaExam(['ela', 'math'], settings, grade3Exam), true)
  assert.equal(studentCanAccessElaExam(['ela'], { gradeLevel: 4 }, grade3Exam), false)
  assert.equal(studentCanAccessElaExam(['ela'], { gradeLevel: null }, grade3Exam), false)
})
