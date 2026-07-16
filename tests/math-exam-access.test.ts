import test from 'node:test'
import assert from 'node:assert/strict'
import { getMathExamBySlug } from '../content/math-exams/index'
import { studentCanAccessMathExam } from '../lib/math-exam-access'

const grade3Bilingual = getMathExamBySlug('2026-grade-3-mc')!
const grade3EnglishOnly = getMathExamBySlug('2016-grade-3-mc')!

test('math exam access requires both the Math track and matching assigned grade', () => {
  const settings = { gradeLevel: 3 as const, mathSpanishEnabled: false }
  assert.equal(studentCanAccessMathExam(['math'], settings, grade3Bilingual), true)
  assert.equal(studentCanAccessMathExam(['ela'], settings, grade3Bilingual), false)
  assert.equal(studentCanAccessMathExam(['math'], { ...settings, gradeLevel: 4 }, grade3Bilingual), false)
  assert.equal(studentCanAccessMathExam(['math'], { ...settings, gradeLevel: null }, grade3Bilingual), false)
})

test('Spanish access requires both the admin language setting and an official edition', () => {
  const disabled = { gradeLevel: 3 as const, mathSpanishEnabled: false }
  const enabled = { ...disabled, mathSpanishEnabled: true }
  assert.equal(studentCanAccessMathExam(['math'], disabled, grade3Bilingual, 'es'), false)
  assert.equal(studentCanAccessMathExam(['math'], enabled, grade3Bilingual, 'es'), true)
  assert.equal(studentCanAccessMathExam(['math'], enabled, grade3EnglishOnly, 'es'), false)
  assert.equal(studentCanAccessMathExam(['math'], enabled, grade3EnglishOnly, 'en'), true)
})
