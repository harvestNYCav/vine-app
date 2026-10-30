import test from 'node:test'
import assert from 'node:assert/strict'
import { ELA_EXAMS } from '../content/ela-exams/index'
import { MATH_EXAMS } from '../content/math-exams/index'
import { getTutorExamPreview } from '../lib/tutor-exam-preview'

test('tutor preview rejects unknown subjects, exams, and sections', () => {
  const exam = ELA_EXAMS[0]
  const section = exam.sections[0]
  assert.equal(getTutorExamPreview('science', exam.slug, section.slug), null)
  assert.equal(getTutorExamPreview('ela', 'missing-exam', section.slug), null)
  assert.equal(getTutorExamPreview('ela', exam.slug, 'missing-section'), null)
  assert.equal(getTutorExamPreview('math', 'missing-exam', 'missing-section'), null)
  assert.equal(getTutorExamPreview('math', MATH_EXAMS[0].slug, 'missing-section'), null)
})

test('ELA previews preserve passage membership and question order for every release', () => {
  for (const exam of ELA_EXAMS) {
    for (const section of exam.sections) {
      const preview = getTutorExamPreview('ela', exam.slug, section.slug)
      assert.ok(preview && preview.subject === 'ela')
      assert.deepEqual(preview.questions.map(question => question.id), section.questionIds)
      assert.ok(preview.questions.every(question => question.examId === exam.id && question.sectionSlug === section.slug && question.stimulusId === section.stimulusId))
      assert.ok(preview.questions.every(question => question.grading.correct && question.grading.explanation))
      assert.ok(preview.section.passage.transcript?.text)
    }
  }
})

test('Math previews preserve question membership and order for every release', () => {
  for (const exam of MATH_EXAMS) {
    for (const section of exam.sections) {
      const preview = getTutorExamPreview('math', exam.slug, section.slug)
      assert.ok(preview && preview.subject === 'math')
      assert.deepEqual(preview.questions.map(question => question.id), section.questionIds)
      assert.ok(preview.questions.every(question => question.examId === exam.id && question.sectionSlug === section.slug))
      assert.ok(preview.questions.every(question => question.grading.explanation.en))
    }
  }
})

test('tutor Math preview allows Spanish only for releases with an official Spanish edition', () => {
  const bilingual = MATH_EXAMS.find(exam => exam.grade === 6 && exam.supportedLanguages.includes('es'))!
  const englishOnly = MATH_EXAMS.find(exam => !exam.supportedLanguages.includes('es'))!
  assert.equal(getTutorExamPreview('math', bilingual.slug, bilingual.sections[0].slug, 'es')?.language, 'es')
  assert.equal(getTutorExamPreview('math', englishOnly.slug, englishOnly.sections[0].slug, 'es')?.language, 'en')
  assert.equal(getTutorExamPreview('math', bilingual.slug, bilingual.sections[0].slug, 'fr')?.language, 'en')
  assert.equal(getTutorExamPreview('math', bilingual.slug, bilingual.sections[0].slug)?.language, 'en')
  assert.equal(getTutorExamPreview('ela', ELA_EXAMS[0].slug, ELA_EXAMS[0].sections[0].slug, 'es')?.language, 'en')
})
