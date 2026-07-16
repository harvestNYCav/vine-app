import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  ELA_EXAMS,
  getElaExamById,
  getElaExamBySlug,
  getElaExamsForGrade,
} from '../content/ela-exams/index'
import { ELA_EXAM_QUESTIONS } from '../content/ela-exams/catalog-runtime'
import rawCatalog from '../content/ela-exams/generated/catalog.json'
import {
  buildElaExamCatalog,
  type RawElaExamCatalog,
} from '../content/ela-exams/catalog-builder'
import { ELA_SKILL_ORDER, getElaSkillLesson } from '../content/ela-exams/section-content'
import {
  getElaExamQuestion,
  getElaExamSection,
  getElaExamSectionQuestions,
  toPublicElaExamQuestion,
} from '../lib/ela-exams'

const root = process.cwd()
const YEARS = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026]
const GRADES = [3, 4, 5, 6, 7, 8] as const
const EXPECTED_COUNTS: Record<number, readonly number[]> = {
  2013: [6, 5, 6, 5, 7, 7],
  2014: [16, 17, 21, 19, 19, 21],
  2015: [18, 19, 20, 21, 21, 21],
  2016: [19, 19, 28, 28, 28, 28],
  2017: [19, 19, 28, 28, 28, 28],
  2018: [12, 12, 21, 21, 21, 21],
  2019: [12, 12, 21, 21, 21, 21],
  2021: [18, 18, 28, 28, 28, 28],
  2022: [12, 12, 21, 21, 21, 21],
  2023: [17, 17, 19, 19, 26, 26],
  2024: [17, 17, 19, 19, 26, 26],
  2025: [17, 17, 19, 19, 26, 26],
  2026: [24, 24, 27, 27, 34, 34],
}

function webpDimensions(path: string) {
  const bytes = readFileSync(path)
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${path} must be a RIFF image`)
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${path} must be a WebP image`)
  const chunk = bytes.subarray(12, 16).toString('ascii')
  if (chunk === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    }
  }
  if (chunk === 'VP8 ') {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    }
  }
  if (chunk === 'VP8L') {
    const dimensions = bytes.readUInt32LE(21)
    return {
      width: 1 + (dimensions & 0x3fff),
      height: 1 + ((dimensions >>> 14) & 0x3fff),
    }
  }
  assert.fail(`${path} uses unsupported WebP chunk ${JSON.stringify(chunk)}`)
}

function listWebps(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listWebps(path) : entry.name.endsWith('.webp') ? [path] : []
  })
}

test('ELA catalog contains every official year/grade multiple-choice release with exact counts', () => {
  assert.equal(ELA_EXAMS.length, 78)
  assert.equal(ELA_EXAM_QUESTIONS.length, 1_583)
  assert.equal(new Set(ELA_EXAMS.map(exam => exam.id)).size, 78)
  assert.equal(new Set(ELA_EXAMS.map(exam => exam.slug)).size, 78)
  assert.equal(new Set(ELA_EXAM_QUESTIONS.map(question => question.id)).size, 1_583)

  for (const year of YEARS) {
    for (const grade of GRADES) {
      const exam = getElaExamBySlug(`${year}-grade-${grade}-mc`)
      assert.ok(exam, `missing ${year} Grade ${grade}`)
      assert.equal(exam.id, `nysed-ela-${year}-grade-${grade}-mc-v1`)
      const count = ELA_EXAM_QUESTIONS.filter(question => question.examId === exam.id).length
      assert.equal(count, EXPECTED_COUNTS[year][grade - 3], `${year} Grade ${grade}`)
    }
  }
})

test('catalog validation rejects leaked keys, wrong-grade standards, and unsafe passage sources', () => {
  const leakedKey = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  leakedKey.exams[0].questions[0].alt += ' Correct Response: A'
  assert.throws(() => buildElaExamCatalog(leakedKey), /safe, substantive alt text/)

  const wrongGrade = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const question = wrongGrade.exams.find(exam => exam.year === 2025 && exam.grade === 8)!.questions[0]
  question.primaryStandard = 'NGLS.ELA.Content.NY-6R1'
  question.skill = 'key-ideas-details'
  assert.throws(() => buildElaExamCatalog(wrongGrade), /standard for the wrong grade/)

  const externalPassage = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  externalPassage.exams[0].stimuli[0].references[0].sourceUrl = 'https://example.com/passage.pdf'
  assert.throws(() => buildElaExamCatalog(externalPassage), /official passage PDF URL/)

  const localPath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  localPath.exams[0].description = '/Users/example/private/vine-app'
  assert.throws(() => buildElaExamCatalog(localPath), /local filesystem path/)
})

test('grade filters expose only the assigned grade and sort newest first', () => {
  assert.deepEqual(getElaExamsForGrade(null), [])
  for (const grade of GRADES) {
    const exams = getElaExamsForGrade(grade)
    assert.equal(exams.length, YEARS.length)
    assert.ok(exams.every(exam => exam.grade === grade))
    assert.deepEqual(exams.map(exam => exam.year), [...YEARS].reverse())
  }
})

test('Vine-authored strategy lessons are complete and grade-specific for all four skill families', () => {
  for (const skill of ELA_SKILL_ORDER) {
    const overviews = new Set<string>()
    const examples = new Set<string>()
    for (const grade of GRADES) {
      const lesson = getElaSkillLesson(skill, grade)
      assert.ok(lesson.overview.length > 100)
      assert.ok(lesson.strategy.length > 100)
      assert.equal(lesson.learningGoals.length, 3)
      assert.ok(lesson.learningGoals.every(goal => goal.includes(`Grade ${grade}`)))
      assert.equal(lesson.workedExample.steps.length, 3)
      assert.match(lesson.workedExample.prompt, /^Vine example:/)
      assert.ok(!overviews.has(lesson.overview), `${skill} repeats its overview across grades`)
      assert.ok(!examples.has(lesson.workedExample.prompt), `${skill} repeats its example across grades`)
      overviews.add(lesson.overview)
      examples.add(lesson.workedExample.prompt)
    }
  }
})

test('each practice section stays on one passage stimulus and exposes official page references', () => {
  for (const exam of ELA_EXAMS) {
    assert.equal(exam.standardsFramework, exam.year <= 2022 ? 'CCLS' : 'NGLS')
    assert.match(exam.accessedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.match(exam.sourceUrl, /^https:\/\/www\.nysedregents\.org\/.+\.pdf$/i)

    const catalogIds = exam.sections.flatMap(section => section.questionIds)
    const examQuestions = ELA_EXAM_QUESTIONS.filter(question => question.examId === exam.id)
    assert.equal(catalogIds.length, examQuestions.length)
    assert.equal(new Set(catalogIds).size, catalogIds.length)
    assert.deepEqual(new Set(catalogIds), new Set(examQuestions.map(question => question.id)))

    for (const section of exam.sections) {
      assert.match(section.slug, /^questions-\d+-\d+$/)
      assert.ok(section.questionIds.length > 0)
      assert.ok(section.passageReferences.length > 0)
      assert.ok(section.skills.includes(section.focusSkill))
      assert.ok(section.standards.length > 0)
      assert.match(section.workedExample.prompt, /^Vine example:/)
      const match = getElaExamSection(exam.id, section.slug)
      assert.equal(match?.section, section)
      const sectionQuestions = getElaExamSectionQuestions(exam.id, section.slug)
      assert.deepEqual(sectionQuestions.map(question => question.id), section.questionIds)
      assert.ok(sectionQuestions.every(question => question.stimulusId === section.stimulusId))
      assert.ok(sectionQuestions.every(question => question.sectionSlug === section.slug))
      assert.ok(sectionQuestions.every(question =>
        question.number >= section.questionStart && question.number <= section.questionEnd,
      ))

      for (const reference of section.passageReferences) {
        assert.equal(reference.sourceUrl, exam.sourceUrl)
        assert.match(reference.sourceUrl, /^https:\/\/www\.nysedregents\.org\/.+\.pdf$/i)
        assert.ok(reference.label.trim().length > 0)
        assert.ok(Number.isInteger(reference.pageStart) && reference.pageStart > 0)
        assert.ok(reference.pageEnd >= reference.pageStart)
      }
    }
  }
})

test('active ELA questions are one-point multiple choice with server-only keys', () => {
  for (const question of ELA_EXAM_QUESTIONS) {
    const exam = getElaExamById(question.examId)
    assert.ok(exam)
    assert.equal(question.type, 'multiple-choice')
    assert.equal(question.points, 1)
    assert.equal(question.grading.mode, 'choice')
    assert.match(question.grading.correct, /^[A-D]$/)
    assert.match(question.id, new RegExp(`^nysed-ela-${exam.year}-g${exam.grade}-mc-q\\d+$`))
    assert.equal(getElaExamQuestion(question.id), question)
    if (question.numberKind === 'release-ordinal') assert.equal(question.session, null)
    else assert.ok(question.session === 1 || question.session === 2)

    const standardPattern = exam.standardsFramework === 'CCLS'
      ? new RegExp(`^CCSS\\.ELA-Literacy\\.(?:RL|RI|L)\\.${exam.grade}\\.[1-9][a-z]?$`)
      : new RegExp(`^NGLS\\.ELA\\.Content\\.NY-${exam.grade}(?:R|L)[1-9][a-z]?$`)
    assert.match(question.primaryStandard, standardPattern)
    assert.ok(question.image.alt.replace(/[^\p{L}\p{N}]/gu, '').length >= 24)
    assert.ok(question.image.alt.length <= 4_000)
    const answerMetadata = /(?:\bKey\s*:\s*[A-D]\b|\bCorrect\s+(?:Answer|Response)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|\bScoring\s+Rubric|\bSample\s+Response)/i
    assert.doesNotMatch(question.image.alt, answerMetadata)

    const publicQuestion = toPublicElaExamQuestion(question)
    assert.ok(!('grading' in publicQuestion), `${question.id} must not expose its answer key`)
  }
})

test('all 1,583 question WebPs exist with exact dimensions and no orphaned ELA assets', () => {
  const paths = ELA_EXAM_QUESTIONS.map(question => question.image.src)
  assert.equal(paths.length, 1_583)
  assert.equal(new Set(paths).size, paths.length)

  for (const question of ELA_EXAM_QUESTIONS) {
    const image = question.image
    assert.ok(image.src.startsWith('/vine-app/nysed/ela/'))
    const localPath = join(root, 'public', image.src.replace('/vine-app/', ''))
    assert.ok(existsSync(localPath), `${localPath} should exist`)
    assert.ok(statSync(localPath).size > 1_000, `${localPath} should not be empty`)
    assert.deepEqual(webpDimensions(localPath), {
      width: image.width,
      height: image.height,
    }, `${localPath} dimensions must match the generated catalog`)
  }

  const generatedRoot = join(root, 'public', 'nysed', 'ela')
  const actualPaths = listWebps(generatedRoot).map(path => path.slice(join(root, 'public').length))
  const expectedPaths = paths.map(path => path.replace('/vine-app', ''))
  assert.deepEqual(actualPaths.sort(), expectedPaths.sort(), 'generated tree must not contain stale question WebPs')
})
