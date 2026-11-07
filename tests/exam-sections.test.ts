import test from 'node:test'
import assert from 'node:assert/strict'
import { getRegentsExamsForCourse, getRegentsSectionQuestions } from '../content/regents'
import { getMathExamsForGrade } from '../content/math-exams'
import { describeExamSection, examSectionIsAvailable } from '../lib/exam-sections'

function firstReadyRegentsSection(course: 'algebra-i' | 'english') {
  for (const exam of getRegentsExamsForCourse(course)) {
    const section = exam.sections.find(item => getRegentsSectionQuestions(exam, item).length > 0)
    if (section) return { exam, section }
  }
  throw new Error(`No ready ${course} Regents section`)
}

const algebra = firstReadyRegentsSection('algebra-i')
const algebraRef = { subject: 'math' as const, examId: algebra.exam.id, sectionSlug: algebra.section.slug }

test('a Regents section is described by its course and administration, with a student link', () => {
  const info = describeExamSection(algebraRef)!
  assert.equal(info.subjectLabel, 'Algebra I Regents')
  assert.match(info.yearLabel, /^(January|June|August) \d{4}$/)
  assert.equal(info.title, algebra.section.title)
  assert.equal(info.href, `/regents/algebra-i/${algebra.exam.slug}/${algebra.section.slug}`)
  assert.equal(info.tutorHref, null)
  assert.equal(info.grade, null)
})

test('a Regents section filed under the wrong subject is not described', () => {
  assert.equal(describeExamSection({ ...algebraRef, subject: 'ela' }), null)
  const english = firstReadyRegentsSection('english')
  assert.equal(describeExamSection({ subject: 'ela', examId: english.exam.id, sectionSlug: english.section.slug })?.subjectLabel, 'English Language Arts Regents')
})

test('Regents sections are available only to students with the track and the course', () => {
  assert.equal(examSectionIsAvailable(algebraRef, { tracks: ['math'], gradeLevel: null, regentsCourses: ['algebra-i'] }), true)
  assert.equal(examSectionIsAvailable(algebraRef, { tracks: ['math'], gradeLevel: null, regentsCourses: ['geometry'] }), false)
  assert.equal(examSectionIsAvailable(algebraRef, { tracks: ['ela'], gradeLevel: null, regentsCourses: ['algebra-i'] }), false)
  assert.equal(examSectionIsAvailable({ ...algebraRef, sectionSlug: 'no-such-section' }, { tracks: ['math'], gradeLevel: null, regentsCourses: ['algebra-i'] }), false)
})

test('Grade 3–8 sections still follow the student grade', () => {
  const exam = getMathExamsForGrade(6)[0]
  const ref = { subject: 'math' as const, examId: exam.id, sectionSlug: exam.sections[0].slug }
  assert.equal(examSectionIsAvailable(ref, { tracks: ['math'], gradeLevel: 6, regentsCourses: [] }), true)
  assert.equal(examSectionIsAvailable(ref, { tracks: ['math'], gradeLevel: 7, regentsCourses: [] }), false)
  assert.equal(examSectionIsAvailable(ref, { tracks: ['math'], gradeLevel: null, regentsCourses: ['algebra-i'] }), false)
  assert.equal(describeExamSection(ref)?.yearLabel, String(exam.year))
})
