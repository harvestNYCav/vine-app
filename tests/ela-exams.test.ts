import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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
import transcriptReviewManifest from '../content/ela-exams/transcript-review-manifest.json'
import {
  buildElaExamCatalog,
  transcriptParagraphMarkers,
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
const CORRECTED_OFFICIAL_RATIONALE_IDS = new Set([
  'nysed-ela-2013-g4-mc-q2',
  'nysed-ela-2013-g6-mc-q5',
  'nysed-ela-2014-g3-mc-q12',
  'nysed-ela-2014-g7-mc-q15',
])
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
const transcriptReviewsById = new Map(
  transcriptReviewManifest.reviews.map(review => [review.stimulusId, review]),
)

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
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

  const missingPassage = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const stimulusWithoutPassage = missingPassage.exams[0].stimuli[0] as unknown as {
    passage?: unknown
  }
  delete stimulusWithoutPassage.passage
  assert.throws(() => buildElaExamCatalog(missingPassage), /unexpected keys/)

  const wrongPassagePath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  wrongPassagePath.exams[0].stimuli[0].passage.src = '/vine-app/nysed/ela/wrong.webp'
  assert.throws(() => buildElaExamCatalog(wrongPassagePath), /wrong passage image path/)

  const wrongPageCount = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  wrongPageCount.exams[0].stimuli[0].passage.pageCount += 1
  assert.throws(() => buildElaExamCatalog(wrongPageCount), /wrong joined page count/)

  const localPath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  localPath.exams[0].description = '/Users/example/private/vine-app'
  assert.throws(() => buildElaExamCatalog(localPath), /local filesystem path/)

  const linuxLocalPath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  linuxLocalPath.exams[0].description = '/home/example/private/vine-app'
  assert.throws(() => buildElaExamCatalog(linuxLocalPath), /local filesystem path/)

  const windowsLocalPath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  windowsLocalPath.exams[0].description = String.raw`C:\Users\reviewer\vine-app`
  assert.throws(() => buildElaExamCatalog(windowsLocalPath), /local filesystem path/)

  for (const exposedPath of [
    '/var/folders/75/private/transcript.txt',
    '/workspaces/vine-app/transcript.txt',
  ]) {
    const exposedLocalPath = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
    exposedLocalPath.exams[0].description = exposedPath
    assert.throws(() => buildElaExamCatalog(exposedLocalPath), /local filesystem path/)
  }

  const proseColonBeforeLineBreak = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  proseColonBeforeLineBreak.exams[0].description = 'Released passage:\nGrade-level reading practice.'
  assert.doesNotThrow(() => buildElaExamCatalog(proseColonBeforeLineBreak))

  const genericExplanation = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const genericQuestion = genericExplanation.exams[0].questions[0]
  genericQuestion.explanation.text = `The official NYSED answer key identifies choice ${genericQuestion.correct} as the correct answer.`
  assert.throws(
    () => buildElaExamCatalog(genericExplanation),
    /substantive, question-specific explanation/,
  )

  const tautologicalExplanation = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  tautologicalExplanation.exams[0].questions[0].explanation.text =
    'Choice B fits because it is the right answer, and this repeats that the selected response is right without citing any passage evidence.'
  assert.throws(
    () => buildElaExamCatalog(tautologicalExplanation),
    /substantive, question-specific explanation/,
  )

  const explanationWithoutReasoning = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const authoredQuestion = explanationWithoutReasoning.exams.find(exam => exam.year >= 2015)!.questions[0]
  authoredQuestion.explanation.text =
    'Choice B quotes paragraph four and accurately describes the cub following its mother into the den for protection from the storm.'
  assert.throws(
    () => buildElaExamCatalog(explanationWithoutReasoning),
    /substantive, question-specific explanation/,
  )

  const footerExplanation = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  footerExplanation.exams[0].questions[0].explanation.text += ' 14'
  assert.throws(
    () => buildElaExamCatalog(footerExplanation),
    /substantive, question-specific explanation/,
  )

  const missingExplanation = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const questionWithoutExplanation = missingExplanation.exams[0].questions[0] as unknown as {
    explanation?: unknown
  }
  delete questionWithoutExplanation.explanation
  assert.throws(() => buildElaExamCatalog(missingExplanation), /unexpected keys/)

  const wrongExplanationSource = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const modernQuestion = wrongExplanationSource.exams.find(exam => exam.year >= 2015)!.questions[0]
  modernQuestion.explanation.source = 'official-nysed'
  assert.throws(
    () => buildElaExamCatalog(wrongExplanationSource),
    /explanation source that does not match its release/,
  )

  const lowerGradeExam = rawCatalog.exams.find(exam => exam.grade === 3)!
  const injectedTranscriptMetadata = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const injectedTranscript = injectedTranscriptMetadata.exams
    .find(exam => exam.id === lowerGradeExam.id)!
    .stimuli[0].passage.transcript as unknown as Record<string, unknown>
  injectedTranscript.correctAnswer = 'B'
  assert.throws(
    () => buildElaExamCatalog(injectedTranscriptMetadata),
    /valid local passage image and required transcript/,
  )

  const missingTranscript = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  delete missingTranscript.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript
  assert.throws(
    () => buildElaExamCatalog(missingTranscript),
    /valid local passage image and required transcript/,
  )

  const bookletChrome = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  bookletChrome.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript!.text += '\nGO ON'
  assert.throws(
    () => buildElaExamCatalog(bookletChrome),
    /valid local passage image and required transcript/,
  )

  const badClosingQuote = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  badClosingQuote.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript!.text +=
    '\n“Remember the story and finish the work,’ she said.'
  assert.throws(
    () => buildElaExamCatalog(badClosingQuote),
    /valid local passage image and required transcript/,
  )

  const punctuationQuoteArtifact = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  punctuationQuoteArtifact.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript!.text +=
    "\nThe concrete walls;' Kathryn said."
  assert.throws(
    () => buildElaExamCatalog(punctuationQuoteArtifact),
    /valid local passage image and required transcript/,
  )

  const spuriousOpeningQuote = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  spuriousOpeningQuote.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript!.text +=
    '\nSpices. ‘They called the drink chocolate.'
  assert.throws(
    () => buildElaExamCatalog(spuriousOpeningQuote),
    /valid local passage image and required transcript/,
  )

  for (const artifact of ['youd stay awake', '= = SS', '—— =']) {
    const knownOcrArtifact = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
    knownOcrArtifact.exams
      .find(exam => exam.id === lowerGradeExam.id)!
      .stimuli[0].passage.transcript!.text += `\n${artifact}`
    assert.throws(
      () => buildElaExamCatalog(knownOcrArtifact),
      /valid local passage image and required transcript/,
    )
  }

  for (const artifact of [
    'Th e passage continues.',
    'A fi eld appears nearby.',
    'O ne-Eyed watched quietly.',
    'The footer retains 2f rappé.',
  ]) {
    const splitWordArtifact = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
    splitWordArtifact.exams
      .find(exam => exam.id === lowerGradeExam.id)!
      .stimuli[0].passage.transcript!.text += `\n${artifact}`
    assert.throws(
      () => buildElaExamCatalog(splitWordArtifact),
      /valid local passage image and required transcript/,
    )
  }

  for (const artifact of [
    'EExxcceerrpptt ffrroomm a reviewed story',
    'ThThee passage continues.',
    '11ssaagguuaarroo:: a kind of cactus',
    'PPrroofifilleess in courage',
    'IInnssiiggnniifificcaanntt events',
    '““You are ready,” the teacher said.',
  ]) {
    const doubledCharacterArtifact = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
    doubledCharacterArtifact.exams
      .find(exam => exam.id === lowerGradeExam.id)!
      .stimuli[0].passage.transcript!.text += `\n${artifact}`
    assert.throws(
      () => buildElaExamCatalog(doubledCharacterArtifact),
      /valid local passage image and required transcript/,
    )
  }

  const missingReviewedVisual = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const visualStimulus = missingReviewedVisual.exams
    .find(exam => exam.year === 2014 && exam.grade === 3)!
    .stimuli.find(stimulus => stimulus.id === 'nysed-ela-2014-g3-stimulus-1-4')!
  visualStimulus.passage.transcript!.text = visualStimulus.passage.transcript!.text.replace(
    /^\[Diagram:.+\]\n\n/m,
    '',
  )
  assert.throws(
    () => buildElaExamCatalog(missingReviewedVisual),
    /valid local passage image and required transcript/,
  )

  const missingUpperGradeVisual = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const upperGradeVisualStimulus = missingUpperGradeVisual.exams
    .find(exam => exam.year === 2025 && exam.grade === 5)!
    .stimuli.find(stimulus => stimulus.id === 'nysed-ela-2025-g5-stimulus-29-35')!
  upperGradeVisualStimulus.passage.transcript!.text = upperGradeVisualStimulus.passage.transcript!.text
    .split('\n')
    .filter(line => !line.startsWith('[Diagram:'))
    .join('\n')
  assert.throws(
    () => buildElaExamCatalog(missingUpperGradeVisual),
    /valid local passage image and required transcript/,
  )

  for (const leak of [
    'Key: B. Choice B is correct because the printed evidence supports it.',
    'The answer is C. Option C is the best response to the question.',
    'The correct option is B according to the scoring guide.',
    'Clave: D. La opción D es correcta porque coincide con el texto.',
  ]) {
    const answerLeak = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
    answerLeak.exams.find(exam => exam.id === lowerGradeExam.id)!.stimuli[0].passage.transcript!.text += `\n${leak}`
    assert.throws(
      () => buildElaExamCatalog(answerLeak),
      /valid local passage image and required transcript/,
    )
  }
})

test('transcript validation preserves legitimate prose and literal bullet markers', () => {
  const goOn = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const goOnTranscript = goOn.exams.find(exam => exam.grade === 3)!.stimuli[0].passage.transcript!
  goOnTranscript.text += '\n“Go on,” she said, inviting the student to continue.'
  assert.doesNotThrow(() => buildElaExamCatalog(goOn))

  const pageNumberProse = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const pageNumberTranscript = pageNumberProse.exams.find(exam => exam.grade === 3)!.stimuli[0].passage.transcript!
  pageNumberTranscript.text += '\nShe turned to page 5 of the notebook and continued reading.'
  assert.doesNotThrow(() => buildElaExamCatalog(pageNumberProse))

  const bullet = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const bulletTranscript = bullet.exams.find(exam => exam.grade === 3)!.stimuli[0].passage.transcript!
  bulletTranscript.text +=
    '\n998 • Cross Country is a printed section heading.\n999 1. Cacao is grown on trees.'
  assert.doesNotThrow(() => buildElaExamCatalog(bullet))

  const symbols = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const symbolTranscript = symbols.exams.find(exam => exam.grade === 3)!.stimuli[0].passage.transcript!
  symbolTranscript.text += '\nA notation example preserves 12², ½, ≤, ≥, and ÷ exactly.'
  assert.doesNotThrow(() => buildElaExamCatalog(symbols))

  const reviewedWordplay = structuredClone(rawCatalog) as unknown as RawElaExamCatalog
  const wordplayTranscript = reviewedWordplay.exams.find(exam => exam.grade === 3)!.stimuli[0].passage.transcript!
  wordplayTranscript.text += '\nThe source says sci-fi fishland, Snoozzzzzze, and go-rillllllas.'
  assert.doesNotThrow(() => buildElaExamCatalog(reviewedWordplay))

  assert.deepEqual(
    transcriptParagraphMarkers([
      '48 Hours is the article title.',
      '1 First reviewed paragraph.',
      '2 second reviewed paragraph begins in lowercase.',
      '50 percent is a numeric sentence, not a printed marker.',
      '3 (Third reviewed paragraph.)',
      '4 [Fourth reviewed paragraph.]',
    ].join('\n')),
    [1, 2, 3, 4],
  )
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
  const passagePaths = new Set<string>()
  let reviewedTranscriptCount = 0
  let transcriptQuestionCount = 0
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
      assert.deepEqual(section.skillLessons.map(lesson => lesson.skill), section.skills)
      assert.equal(new Set(section.skillLessons.map(lesson => lesson.skill)).size, section.skills.length)
      assert.ok(section.standards.length > 0)
      assert.match(section.workedExample.prompt, /^Vine example:/)
      assert.equal(
        section.passage.src,
        `/vine-app/nysed/ela/${exam.year}/grade-${exam.grade}/en/passage-${section.questionStart}-${section.questionEnd}.webp`,
      )
      assert.ok(section.passage.width >= 420)
      assert.ok(section.passage.height >= 260 && section.passage.height <= 16_000)
      assert.match(section.passage.alt, /PDF page breaks are removed/)
      assert.ok(section.passage.transcript, `${section.stimulusId} needs its reviewed transcript`)
      assert.ok(section.passage.transcript.text.length >= 400)
      assert.match(section.passage.transcript.sourcePdfSha256, /^[0-9a-f]{64}$/)
      assert.match(section.passage.transcript.passageImageSha256, /^[0-9a-f]{64}$/)
      reviewedTranscriptCount += 1
      transcriptQuestionCount += section.questionIds.length
      assert.ok(!passagePaths.has(section.passage.src), `${section.stimulusId} repeats a passage asset`)
      passagePaths.add(section.passage.src)
      const match = getElaExamSection(exam.id, section.slug)
      assert.equal(match?.section, section)
      const sectionQuestions = getElaExamSectionQuestions(exam.id, section.slug)
      assert.deepEqual(sectionQuestions.map(question => question.id), section.questionIds)
      assert.ok(sectionQuestions.every(question => question.stimulusId === section.stimulusId))
      assert.ok(sectionQuestions.every(question => question.sectionSlug === section.slug))
      assert.equal(section.focusSkill, sectionQuestions[0].skill)
      assert.ok(sectionQuestions.every(question =>
        section.skillLessons.some(lesson => lesson.skill === question.skill),
      ))
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
      assert.equal(
        section.passage.pageCount,
        section.passageReferences.reduce(
          (total, reference) => total + reference.pageEnd - reference.pageStart + 1,
          0,
        ),
      )
    }
  }
  assert.equal(passagePaths.size, 242)
  assert.equal(reviewedTranscriptCount, 242)
  assert.equal(transcriptQuestionCount, 1_583)
})

test('every grade surfaces a lesson for every skill represented by its released questions', () => {
  const lowerGradeExamIds = new Set(
    ELA_EXAMS.filter(exam => exam.grade === 3 || exam.grade === 4).map(exam => exam.id),
  )
  const lowerGradeQuestions = ELA_EXAM_QUESTIONS.filter(question =>
    lowerGradeExamIds.has(question.examId),
  )
  assert.equal(
    lowerGradeQuestions.filter(question => question.skill === 'integration-knowledge').length,
    56,
  )
  assert.equal(
    lowerGradeQuestions.filter(question => question.skill === 'language-vocabulary').length,
    26,
  )

  for (const grade of GRADES) {
    const gradeExams = ELA_EXAMS.filter(exam => exam.grade === grade)
    const questionedSkills = new Set(
      ELA_EXAM_QUESTIONS
        .filter(question => gradeExams.some(exam => exam.id === question.examId))
        .map(question => question.skill),
    )
    const surfacedSkills = new Set(
      gradeExams.flatMap(exam => exam.sections.flatMap(section =>
        section.skillLessons.map(lesson => lesson.skill),
      )),
    )
    assert.deepEqual(surfacedSkills, questionedSkills)
    assert.ok(surfacedSkills.has('integration-knowledge'))
    assert.ok(surfacedSkills.has('language-vocabulary'))
  }
})

test('reviewed transcript manifest, sidecars, generated catalog, and passage bytes stay in exact parity', () => {
  assert.deepEqual(transcriptReviewManifest.scope, {
    grades: [3, 4, 5, 6, 7, 8],
    stimulusCount: 242,
    questionCount: 1_583,
  })
  assert.equal(transcriptReviewManifest.reviews.length, 242)
  assert.equal(transcriptReviewsById.size, 242)

  const transcriptDirectory = join(root, 'content', 'ela-exams', 'transcripts')
  const sidecarNames = readdirSync(transcriptDirectory)
    .filter(name => /^\d{4}-grade-[3-8]\.json$/.test(name))
    .sort()
  assert.equal(sidecarNames.length, 78)

  const sidecarsByStimulusId = new Map<string, {
    source: string
    text: string
    paragraphMarkers: number[]
    visualDescriptionCount: number
  }>()
  for (const name of sidecarNames) {
    const sidecar = JSON.parse(readFileSync(join(transcriptDirectory, name), 'utf8')) as {
      passages: Array<{
        stimulusId: string
        source: string
        text: string
        paragraphMarkers: number[]
        visualDescriptionCount: number
      }>
    }
    for (const passage of sidecar.passages) {
      assert.ok(!sidecarsByStimulusId.has(passage.stimulusId), `duplicate sidecar ${passage.stimulusId}`)
      sidecarsByStimulusId.set(passage.stimulusId, passage)
    }
  }
  assert.equal(sidecarsByStimulusId.size, 242)

  for (const exam of ELA_EXAMS) {
    for (const section of exam.sections) {
      const transcript = section.passage.transcript
      assert.ok(transcript, `${section.stimulusId} needs a catalog transcript`)
      const review = transcriptReviewsById.get(section.stimulusId)
      assert.ok(review, `${section.stimulusId} needs a review record`)
      const sidecar = sidecarsByStimulusId.get(section.stimulusId)
      assert.ok(sidecar, `${section.stimulusId} needs a sidecar record`)

      assert.equal(review.examId, exam.id)
      assert.equal(transcript.source, review.source)
      assert.equal(transcript.sourcePdfSha256, review.sourcePdfSha256)
      assert.equal(transcript.passageImageSha256, review.passageImageSha256)
      assert.equal(sha256(transcript.text), review.textSha256)
      assert.deepEqual(transcriptParagraphMarkers(transcript.text), review.paragraphMarkers)

      const visualDescriptionCount = transcript.text.split('\n').filter(line =>
        /^\[(?:Illustration|Diagram|Photograph|Map|Chart|Text box|Sidebar|Caption):\s+\S.+\]$/i.test(line.trim()),
      ).length
      assert.equal(visualDescriptionCount, review.visualDescriptionCount)
      assert.equal(sidecar.source, review.source)
      assert.equal(sidecar.text, transcript.text)
      assert.deepEqual(sidecar.paragraphMarkers, review.paragraphMarkers)
      assert.equal(sidecar.visualDescriptionCount, review.visualDescriptionCount)

      const passagePath = join(root, 'public', section.passage.src.replace('/vine-app/', ''))
      assert.equal(sha256(readFileSync(passagePath)), review.passageImageSha256)
    }
  }
})

test('reviewed ELA explanations preserve the passage evidence without overstating it', () => {
  const wampanoag = getElaExamQuestion('nysed-ela-2013-g4-mc-q2')!
  assert.match(wampanoag.grading.explanation, /seek Maushop's help/i)
  assert.doesNotMatch(wampanoag.grading.explanation, /Wampanoag people as the antagonist/i)
  assert.equal(wampanoag.grading.explanationSource, 'official-nysed-corrected')

  const snowshoe = getElaExamQuestion('nysed-ela-2014-g3-mc-q12')!
  assert.match(snowshoe.grading.explanation, /slopes and trails nearby/i)
  assert.doesNotMatch(snowshoe.grading.explanation, /trails and mountains/i)
  assert.equal(snowshoe.grading.explanationSource, 'official-nysed-corrected')

  const traverse = getElaExamQuestion('nysed-ela-2013-g6-mc-q5')!
  assert.match(traverse.grading.explanation, /path of groomed snow and ice/i)
  assert.match(traverse.grading.explanation, /crevasses, deep snow, mountains/i)
  assert.doesNotMatch(traverse.grading.explanation, /window of time for working/i)
  assert.equal(traverse.grading.explanationSource, 'official-nysed-corrected')

  const leftovers = getElaExamQuestion('nysed-ela-2014-g7-mc-q15')!
  assert.match(leftovers.grading.explanation, /material remaining after the planets formed/i)
  assert.match(leftovers.grading.explanation, /without claiming.*previously used parts of planets/i)
  assert.doesNotMatch(leftovers.grading.explanation, /what were once the .previously used. parts of planets/i)
  assert.equal(leftovers.grading.explanationSource, 'official-nysed-corrected')

  const height = getElaExamQuestion('nysed-ela-2023-g3-mc-q4')!
  assert.match(height.grading.explanation, /earlier measurement/i)
  assert.match(height.grading.explanation, /rather than conclusively proving their current heights/i)

  const apples = getElaExamQuestion('nysed-ela-2024-g3-mc-q26')!
  assert.match(apples.grading.explanation, /reluctantly accepts/i)
  assert.match(apples.grading.explanation, /rather than intentionally deciding to trust him/i)
  assert.doesNotMatch(apples.grading.explanation, /trusting what others contribute brings/i)

  const glanced = getElaExamQuestion('nysed-ela-2026-g3-mc-q3')!
  assert.match(glanced.grading.explanation, /“Glanced” means looked briefly/)
  assert.match(glanced.grading.explanation, /purpose rather than the exact meaning/i)
})

test('active ELA questions have substantive sourced explanations with server-only grading', () => {
  const explanationSourceCounts = {
    'official-nysed': 0,
    'official-nysed-corrected': 0,
    'vine-authored': 0,
  }
  const genericFallback = /official NYSED answer key identifies choice [A-D] as the correct answer/i

  for (const question of ELA_EXAM_QUESTIONS) {
    const exam = getElaExamById(question.examId)
    assert.ok(exam)
    assert.equal(question.type, 'multiple-choice')
    assert.equal(question.points, 1)
    assert.equal(question.grading.mode, 'choice')
    assert.match(question.grading.correct, /^[A-D]$/)
    assert.ok(question.grading.explanation.replace(/[^\p{L}\p{N}]/gu, '').length >= 40)
    assert.doesNotMatch(question.grading.explanation, genericFallback)
    const expectedSource = exam.year >= 2015
      ? 'vine-authored'
      : CORRECTED_OFFICIAL_RATIONALE_IDS.has(question.id)
        ? 'official-nysed-corrected'
        : 'official-nysed'
    assert.equal(question.grading.explanationSource, expectedSource)
    explanationSourceCounts[question.grading.explanationSource] += 1
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
    assert.ok(!('correct' in publicQuestion), `${question.id} must not expose its answer key`)
    assert.ok(!('explanation' in publicQuestion), `${question.id} must not expose its explanation`)
    assert.ok(!('explanationSource' in publicQuestion), `${question.id} must not expose explanation provenance`)
  }

  assert.deepEqual(explanationSourceCounts, {
    'official-nysed': 145,
    'official-nysed-corrected': 4,
    'vine-authored': 1_434,
  })
})

test('all question and passage WebPs exist with exact dimensions and no orphaned ELA assets', () => {
  const questionPaths = ELA_EXAM_QUESTIONS.map(question => question.image.src)
  const passageAssets = ELA_EXAMS.flatMap(exam => exam.sections.map(section => section.passage))
  const passagePaths = passageAssets.map(passage => passage.src)
  const paths = [...questionPaths, ...passagePaths]
  assert.equal(questionPaths.length, 1_583)
  assert.equal(passagePaths.length, 242)
  assert.equal(new Set(questionPaths).size, questionPaths.length)
  assert.equal(new Set(passagePaths).size, passagePaths.length)
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

  for (const passage of passageAssets) {
    assert.ok(passage.src.startsWith('/vine-app/nysed/ela/'))
    const localPath = join(root, 'public', passage.src.replace('/vine-app/', ''))
    assert.ok(existsSync(localPath), `${localPath} should exist`)
    assert.ok(statSync(localPath).size > 1_000, `${localPath} should not be empty`)
    assert.deepEqual(webpDimensions(localPath), {
      width: passage.width,
      height: passage.height,
    }, `${localPath} dimensions must match the generated catalog`)
  }

  const generatedRoot = join(root, 'public', 'nysed', 'ela')
  const actualPaths = listWebps(generatedRoot).map(path => path.slice(join(root, 'public').length))
  const expectedPaths = paths.map(path => path.replace('/vine-app', ''))
  assert.deepEqual(actualPaths.sort(), expectedPaths.sort(), 'generated tree must not contain stale question WebPs')
})
