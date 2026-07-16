import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  MATH_EXAMS,
  getMathExamById,
  getMathExamBySlug,
  getMathExamsForGrade,
} from '../content/math-exams/index'
import { MATH_EXAM_QUESTIONS } from '../content/math-exams/catalog-runtime'
import rawCatalog from '../content/math-exams/generated/catalog.json'
import {
  buildMathExamCatalog,
  type RawMathExamCatalog,
} from '../content/math-exams/catalog-builder'
import { buildMathExamSection, type MathDomainCode } from '../content/math-exams/domain-content'
import {
  getMathExamQuestion,
  getMathExamSectionQuestions,
  normalizeMathAnswer,
  toPublicMathExamQuestion,
} from '../lib/math-exams'

const root = process.cwd()
const YEARS = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026]
const GRADES = [3, 4, 5, 6, 7, 8] as const
const SPANISH_YEARS = new Set([2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026])
const EXPECTED_COUNTS: Record<number, readonly number[]> = {
  2013: [10, 11, 11, 12, 12, 12],
  2014: [25, 24, 24, 30, 30, 27],
  2015: [24, 21, 24, 28, 28, 23],
  2016: [26, 26, 26, 31, 31, 31],
  2017: [31, 32, 32, 37, 38, 38],
  2018: [19, 24, 22, 22, 26, 27],
  2019: [19, 24, 22, 22, 26, 26],
  2021: [19, 23, 23, 24, 26, 26],
  2022: [19, 22, 22, 22, 23, 23],
  2023: [16, 19, 19, 19, 21, 21],
  2024: [16, 19, 19, 19, 21, 21],
  2025: [16, 19, 19, 19, 21, 21],
  2026: [27, 31, 31, 31, 34, 34],
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

test('catalog contains every official year/grade MC release with exact counts', () => {
  assert.equal(MATH_EXAMS.length, 78)
  assert.equal(MATH_EXAM_QUESTIONS.length, 1839)
  assert.equal(new Set(MATH_EXAMS.map(exam => exam.id)).size, 78)
  assert.equal(new Set(MATH_EXAMS.map(exam => exam.slug)).size, 78)
  assert.equal(new Set(MATH_EXAM_QUESTIONS.map(question => question.id)).size, 1839)

  for (const year of YEARS) {
    for (const grade of GRADES) {
      const exam = getMathExamBySlug(`${year}-grade-${grade}-mc`)
      assert.ok(exam, `missing ${year} Grade ${grade}`)
      assert.equal(exam.id, `nysed-${year}-grade-${grade}-mc-v1`)
      const count = MATH_EXAM_QUESTIONS.filter(question => question.examId === exam.id).length
      assert.equal(count, EXPECTED_COUNTS[year][grade - 3], `${year} Grade ${grade}`)
    }
  }
})

test('runtime catalog validation rejects answer metadata in accessibility text', () => {
  const leakedEnglish = structuredClone(rawCatalog) as unknown as RawMathExamCatalog
  leakedEnglish.exams[0].questions[0].alt!.en += ' Key: A'
  assert.throws(
    () => buildMathExamCatalog(leakedEnglish),
    /safe, substantive English alt text/,
  )

  const leakedSpanish = structuredClone(rawCatalog) as unknown as RawMathExamCatalog
  const bilingualExam = leakedSpanish.exams.find(exam => exam.supportedLanguages.includes('es'))!
  const spanishAlt = bilingualExam.questions[0].alt?.es ?? ''
  bilingualExam.questions[0].alt = { ...bilingualExam.questions[0].alt!, es: `${spanishAlt} Clave: A` }
  assert.throws(
    () => buildMathExamCatalog(leakedSpanish),
    /safe, substantive Spanish alt text/,
  )

  const wrongGrade = structuredClone(rawCatalog) as unknown as RawMathExamCatalog
  const ordinaryGradeEight = wrongGrade.exams
    .find(exam => exam.year === 2025 && exam.grade === 8)!
    .questions[0]
  ordinaryGradeEight.primaryStandard = 'NGLS.Math.Content.NY-6.G.3'
  ordinaryGradeEight.domain = 'G'
  assert.throws(
    () => buildMathExamCatalog(wrongGrade),
    /standard for the wrong grade/,
  )
})

test('grade filters expose only the assigned grade and sort newest first', () => {
  assert.deepEqual(getMathExamsForGrade(null), [])
  for (const grade of GRADES) {
    const exams = getMathExamsForGrade(grade)
    assert.equal(exams.length, YEARS.length)
    assert.ok(exams.every(exam => exam.grade === grade))
    assert.deepEqual(exams.map(exam => exam.year), [...YEARS].reverse())
  }
})

test('learning sections use complete, grade-specific bilingual lessons', () => {
  const domainsByGrade: Record<number, MathDomainCode[]> = {
    3: ['OA', 'NBT', 'NF', 'MD', 'G'],
    4: ['OA', 'NBT', 'NF', 'MD', 'G'],
    5: ['OA', 'NBT', 'NF', 'MD', 'G'],
    6: ['RP', 'NS', 'EE', 'G', 'SP'],
    7: ['RP', 'NS', 'EE', 'G', 'SP'],
    8: ['NS', 'EE', 'F', 'G', 'SP'],
  }
  const overviewByDomain = new Map<MathDomainCode, Set<string>>()

  for (const grade of GRADES) {
    for (const domain of domainsByGrade[grade]) {
      const lesson = buildMathExamSection(domain, grade, [])
      assert.ok(lesson.overview.en.length > 40)
      assert.ok(lesson.overview.es.length > 40)
      assert.equal(lesson.learningGoals.length, 3)
      assert.ok(lesson.workedExample.steps.length >= 3)
      const overviews = overviewByDomain.get(domain) ?? new Set<string>()
      assert.ok(!overviews.has(lesson.overview.en), `${domain} repeats its lesson across grades`)
      overviews.add(lesson.overview.en)
      overviewByDomain.set(domain, overviews)
    }
  }
})

test('active questions are one-point multiple choice and belong to one section', () => {
  for (const exam of MATH_EXAMS) {
    assert.equal(exam.standardsFramework, exam.year <= 2022 ? 'CCLS' : 'NGLS')
    assert.deepEqual(exam.supportedLanguages, SPANISH_YEARS.has(exam.year) ? ['en', 'es'] : ['en'])
    assert.match(exam.accessedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(exam.sourceUrl.en.startsWith('https://www.nysedregents.org/'))
    if (SPANISH_YEARS.has(exam.year)) {
      assert.ok(exam.sourceUrl.es?.startsWith('https://www.nysedregents.org/'))
    } else {
      assert.equal(exam.sourceUrl.es, undefined)
    }

    const catalogIds = exam.sections.flatMap(section => section.questionIds)
    const examQuestions = MATH_EXAM_QUESTIONS.filter(question => question.examId === exam.id)
    assert.equal(catalogIds.length, examQuestions.length)
    assert.equal(new Set(catalogIds).size, catalogIds.length)
    assert.deepEqual(new Set(catalogIds), new Set(examQuestions.map(question => question.id)))

    for (const section of exam.sections) {
      const sectionQuestions = getMathExamSectionQuestions(exam.id, section.slug)
      assert.deepEqual(sectionQuestions.map(question => question.id), section.questionIds)
    }
  }

  for (const question of MATH_EXAM_QUESTIONS) {
    const exam = getMathExamById(question.examId)
    assert.ok(exam)
    assert.equal(question.type, 'multiple-choice')
    assert.equal(question.points, 1)
    assert.equal(question.grading.mode, 'choice')
    assert.match(question.id, new RegExp(`^nysed-${exam.year}-g${exam.grade}-mc-q\\d+$`))
    assert.equal(getMathExamQuestion(question.id), question)
    if (question.numberKind === 'release-ordinal') assert.equal(question.session, null)
    else assert.ok(question.session === 1 || question.session === 2)

    const framework = exam.standardsFramework === 'CCLS' ? 'CCSS' : 'NGLS'
    const gradeMatch = question.primaryStandard.match(
      new RegExp(`^${framework}\\.Math\\.Content\\.(?:NY-)?([3-8])\\.`),
    )
    assert.ok(gradeMatch, `${question.id} has a malformed framework or grade`)
    assert.ok(
      Number(gradeMatch[1]) === exam.grade || Number(gradeMatch[1]) === exam.grade - 1,
      `${question.id} has a standard outside its grade/prerequisite band`,
    )
    assert.ok(question.image.alt.en.replace(/[^\p{L}\p{N}]/gu, '').length >= 24)
    if (exam.supportedLanguages.includes('es')) {
      assert.ok(question.image.alt.es.replace(/[^\p{L}\p{N}]/gu, '').length >= 24)
    }
    const answerMetadata = /(?:\b(?:Key|Clave)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|\b(?:Primary|Aligned)\s+CCLS|\bMeasured(?:\s+CCLS)?\s*:?\s*(?:NY-)?[3-8]\.|\bMap\s+to\s+the\s+Standards|\bScoring\s+Rubric|\bSample\s+Response|\bR[uú]brica\s+de\s+puntuaci[oó]n|\bRespuesta\s+de\s+muestra)/i
    assert.doesNotMatch(question.image.alt.en, answerMetadata)
    assert.doesNotMatch(question.image.alt.es, answerMetadata)

    const publicQuestion = toPublicMathExamQuestion(question)
    assert.ok(!('grading' in publicQuestion), `${question.id} must not expose its answer key`)
  }

  const prerequisiteAlignments = MATH_EXAM_QUESTIONS.flatMap(question => {
    const exam = getMathExamById(question.examId)!
    return [question.primaryStandard, ...(question.secondaryStandards ?? [])]
      .filter(standard => {
        const grade = Number(standard.match(/Math\.Content\.(?:NY-)?([3-8])\./)?.[1])
        return grade === exam.grade - 1
      })
      .map(standard => [question.id, standard])
  })
  assert.equal(prerequisiteAlignments.length, 80)
})

test('all 3,131 referenced WebPs exist with exact dimensions and no orphaned question assets', () => {
  const images = MATH_EXAM_QUESTIONS.flatMap(question => [
    question.image.en,
    ...(question.image.es ? [question.image.es] : []),
  ])
  const paths = images.map(image => image.src)
  assert.equal(images.length, 3131)
  assert.equal(new Set(paths).size, images.length)

  for (const image of images) {
    const publicPath = image.src
    assert.ok(publicPath.startsWith('/vine-app/nysed/math/'))
    const localPath = join(root, 'public', publicPath.replace('/vine-app/', ''))
    assert.ok(existsSync(localPath), `${localPath} should exist`)
    assert.ok(statSync(localPath).size > 1000, `${localPath} should not be empty`)
    assert.deepEqual(webpDimensions(localPath), {
      width: image.width,
      height: image.height,
    }, `${localPath} dimensions must match the generated catalog`)
  }

  const generatedRoot = join(root, 'public', 'nysed', 'math')
  const actualPaths = listWebps(generatedRoot).map(path => path.slice(join(root, 'public').length))
  const expectedPaths = paths.map(path => path.replace('/vine-app', ''))
  assert.deepEqual(actualPaths.sort(), expectedPaths.sort(), 'generated tree must not contain stale question WebPs')
})

test('answer normalization accepts harmless formatting differences', () => {
  assert.equal(normalizeMathAnswer(' $1,234. '), '1234')
  assert.equal(normalizeMathAnswer(' 1 / 2 '), '1/2')
})
