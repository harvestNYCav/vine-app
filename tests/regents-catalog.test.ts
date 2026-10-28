import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRegentsExamsForCourse,
  getRegentsSectionQuestions,
  isRegentsQuestionReady,
} from '../content/regents/index'
import type { RegentsCourse, RegentsExam } from '../content/regents/types'

const expectedCounts: Record<RegentsCourse, number> = {
  'algebra-i': 33,
  geometry: 29,
  'algebra-ii': 26,
  english: 33,
}

test('Regents catalog indexes every released Math and ELA administration', () => {
  const exams = Object.entries(expectedCounts).flatMap(([course, count]) => {
    const courseExams = getRegentsExamsForCourse(course as RegentsCourse)
    assert.equal(courseExams.length, count, `${course} exam count`)
    return courseExams
  })
  assert.equal(exams.length, 121)
  assert.equal(exams.reduce((count, exam) => count + exam.questions.length, 0), 2901)
  assert.equal(new Set(exams.map(exam => exam.id)).size, exams.length)
  assert.ok(exams.every(exam => exam.sourceUrl.startsWith('https://www.nysedregents.org/')))
  assert.ok(exams.every(exam => exam.answerKeyUrl.startsWith('https://www.nysedregents.org/')))
})

test('catalog question IDs, sections, and keys remain internally consistent', () => {
  const exams: RegentsExam[] = (Object.keys(expectedCounts) as RegentsCourse[])
    .flatMap(course => getRegentsExamsForCourse(course))
  for (const exam of exams) {
    const byId = new Map(exam.questions.map(question => [question.id, question]))
    assert.equal(byId.size, exam.questions.length, `duplicate question in ${exam.id}`)
    for (const question of exam.questions) {
      assert.match(question.correct, /^[1-4]$/, `${question.id} key`)
      assert.equal(new Set(question.choices.map(choice => choice.label)).size, question.choices.length)
    }
    for (const section of exam.sections) {
      for (const id of section.questionIds) {
        const question = byId.get(id)
        assert.ok(question, `${exam.id} section references missing ${id}`)
        assert.equal(question.sectionSlug, section.slug)
      }
      const published = getRegentsSectionQuestions(exam, section)
      assert.equal(published.length, section.questionIds.length, `${exam.id}/${section.slug} has unreviewed questions`)
      assert.ok(published.every(question => isRegentsQuestionReady(question, section, exam.course)))
      assert.ok(published.every(question => question.explanation.length > 0 && question.readiness === 'reviewed'))
      assert.ok(published.every(question => !question.image || !/\b(?:keyed|correct) (?:answer|choice)\b/i.test(question.image.alt)),
        `${exam.id} image alt text must not reveal the key`)
      if (exam.course !== 'english') {
        assert.ok(published.every(question => !question.choices.every(choice => /^(?:graph|diagram|figure)\s*[1-4]$/i.test(choice.text))),
          `${exam.id} graph choices need descriptions that distinguish them`)
      }
      if (exam.course === 'english' && published.length) {
        assert.equal(section.passage?.transcriptReviewStatus, 'reviewed')
      }
    }
  }
})
