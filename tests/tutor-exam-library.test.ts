import test from 'node:test'
import assert from 'node:assert/strict'
import { getTutorExamLibrary } from '../lib/tutor-exam-library'
import { describeExamSection } from '../lib/exam-sections'
import { getElaExamBySlug } from '../content/ela-exams'
import { getMathExamBySlug } from '../content/math-exams'

test('Grade 6 library filters each subject and year and links to valid tutor previews', () => {
  for (const subject of ['ela', 'math'] as const) {
    const library = getTutorExamLibrary({ subject, grade: '6', year: '2026' })
    assert.equal(library.grade, 6)
    assert.equal(library.subject, subject)
    assert.equal(library.exams.length, 1)
    const exam = subject === 'ela' ? getElaExamBySlug('2026-grade-6-mc')! : getMathExamBySlug('2026-grade-6-mc')!
    assert.equal(library.exams[0].id, exam.id)
    assert.equal(library.exams[0].sections.length, exam.sections.length)
    for (const section of library.exams[0].sections) {
      const info = describeExamSection({ subject, examId: exam.id, sectionSlug: section.slug })!
      assert.equal(section.href, info.tutorHref)
      assert.ok(section.questionCount > 0)
      assert.ok(info.href.startsWith(`/${subject}/exams/`), 'student links remain student routes')
    }
  }
})

test('all years includes releases beyond the newest with no answer data in the library', () => {
  const library = getTutorExamLibrary({ subject: 'math', grade: '6', year: 'all' })
  assert.equal(library.exams.length, library.years.length)
  assert.ok(library.exams.length > 1)
  assert.equal(library.exams[0].year, Math.max(...library.years))
  assert.equal(JSON.stringify(library).includes('grading'), false)
})

test('unsupported or repeated filters fall back to a valid subject, grade, and release', () => {
  for (const filters of [
    {},
    { subject: 'unknown', grade: '9', year: '1900' },
    { subject: ['math', 'ela'], grade: ['6', '7'], year: ['2026', '2025'] },
    { grade: '6x', year: '2026x' },
  ]) {
    const library = getTutorExamLibrary(filters)
    assert.equal(library.subject, 'ela')
    assert.equal(library.grade, 3)
    assert.equal(library.year, library.years[0])
    assert.equal(library.exams.length, 1)
  }
})
