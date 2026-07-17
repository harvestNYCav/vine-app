import type { GradeLevel } from '@/lib/grade-levels'
import { isGradeLevel } from '@/lib/grade-levels'
import { buildElaExamSection, ELA_SKILL_ORDER } from './section-content'
import type {
  ElaExamChoice,
  ElaExamDefinition,
  ElaExamQuestionNumberKind,
  ElaExamQuestionRecord,
  ElaExplanationSource,
  ElaPassageAsset,
  ElaPassageReference,
  ElaQuestionImage,
  ElaSkill,
  ElaStandardsFramework,
} from './types'

export type RawElaPassageReference = ElaPassageReference

export type RawElaStimulus = {
  id: string
  label: string
  questionStart: number
  questionEnd: number
  passage: ElaPassageAsset
  references: RawElaPassageReference[]
}

export type RawElaQuestion = {
  id: string
  number: number
  sourceNumberKind?: ElaExamQuestionNumberKind
  session: 1 | 2 | null
  sourcePage: number
  primaryStandard: string
  secondaryStandards?: string[]
  stimulusId: string
  skill: ElaSkill
  correct: ElaExamChoice
  explanation: {
    text: string
    source: ElaExplanationSource
  }
  image: Omit<ElaQuestionImage, 'alt'>
  alt: string
}

export type RawElaExam = {
  id: string
  slug: string
  year: number
  grade: GradeLevel
  standardsFramework: ElaStandardsFramework
  title: string
  description: string
  sourceTitle: string
  sourceUrl: string
  stimuli: RawElaStimulus[]
  questions: RawElaQuestion[]
}

export type RawElaExamCatalog = {
  schemaVersion: 3
  generatedAt: string
  accessedAt: string
  sourceUpdatedAt: string
  sourceIndexUrl: string
  exams: RawElaExam[]
}

const RELEASE_YEARS = [
  2013, 2014, 2015, 2016, 2017, 2018, 2019,
  2021, 2022, 2023, 2024, 2025, 2026,
] as const

const EXPECTED_COUNTS: Record<(typeof RELEASE_YEARS)[number], readonly number[]> = {
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

const RELEASE_YEAR_SET = new Set<number>(RELEASE_YEARS)
const SKILL_SET = new Set<ElaSkill>(ELA_SKILL_ORDER)
const CCLS_STANDARD_PATTERN = /^CCSS\.ELA-Literacy\.(RL|RI|L)\.([3-8])\.([1-9])([a-z])?$/
const NGLS_STANDARD_PATTERN = /^NGLS\.ELA\.Content\.NY-([3-8])(R|L)([1-9])([a-z])?$/
const ANSWER_METADATA_PATTERN = /(?:\bKey\s*:\s*[A-D]\b|\bCorrect\s+(?:Answer|Response)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|\b(?:Primary|Secondary|Aligned)\s+(?:CCLS|Standard)|\bMeasured(?:\s+CCLS)?\s*:|\bMap\s+to\s+the\s+Standards|\bScoring\s+Rubric|\bSample\s+Response|\bAnnotated\s+(?:Item|Response))/i
const EXPLANATION_REASONING_PATTERN = /\b(?:because|since|therefore|thus|consequently|so|as\s+a\s+result|which\s+(?:show(?:s|ed|ing)?|means?|indicates?|demonstrates?|reveals?|explains?)|(?:this|that)\s+(?:show(?:s|ed|ing)?|means?|indicates?|supports?|demonstrates?|reveals?|explains?)|show(?:s|ed|ing)?|means?|illustrat(?:e|es|ed|ing)|suggest(?:s|ed|ing)?|clarif(?:y|ies|ied)|supports?|supported\s+by|evidence|demonstrates?|indicates?|reveals?|explains?|confirms?|contradicts?|connect(?:s|ed|ing)?|identif(?:y|ies|ied)|recogniz(?:e|es|ed)|understand(?:s|ing)?|deduc(?:e|es|ed)|determin(?:e|es|ed)|infer(?:s|red|ring)?|interpret(?:s|ed|ing)?|rel(?:y|ies|ied)|uses?|contribut(?:e|es|ed|ing))\b/i
const GENERIC_EXPLANATION_PATTERN = /(?:\b(?:official\s+)?(?:nysed\s+)?answer\s+key\b|\baccording\s+to\s+(?:the\s+)?(?:official\s+)?(?:answer|key)\b|\bidentifies\s+choice\s+[A-D]\s+as\s+the\s+correct\s+answer\b|\bbecause\s+(?:it|this|that|choice\s+[A-D])\s+is\s+(?:the\s+)?(?:correct|right)\s+(?:answer|choice|response)\b|^(?:the\s+)?(?:correct|right)\s+answer\s+is\s+(?:choice\s+)?[A-D][.!]?$|^choice\s+[A-D]\s+is\s+(?:correct|right)[.!]?$)/i
const EXPLANATION_ARTIFACT_PATTERN = /(?:\bWHY\s+(?:CHOICE|ANSWER)\b|\bWHY\s+(?:THE\s+)?OTHER\s+(?:CHOICES|ANSWERS|RESPONSES)\b|\bHOW\s+TO\s+HELP\s+STUDENTS\b|\bINSTRUCTIONAL\s+(?:SUGGESTIONS?|IMPLICATIONS?)\b|\bQUESTION\s+ANNOTATION\b|[.!?”’]\s+\d{1,3}$)/i
const LOCAL_FILESYSTEM_PATH_PATTERN = /(?:file:\/\/|\/(?:Users|home|private|tmp|root|workspace|workspaces)\/|\/var\/folders\/|[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)/i

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid generated NYSED ELA catalog: ${message}`)
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function substantiveAlt(value: unknown): value is string {
  return validText(value)
    && value.length <= 4_000
    && value.replace(/[^\p{L}\p{N}]/gu, '').length >= 24
}

function safeAlt(value: unknown): value is string {
  return substantiveAlt(value) && !ANSWER_METADATA_PATTERN.test(value)
}

function substantiveExplanation(value: unknown, source: ElaExplanationSource): value is string {
  if (!validText(value)) return false
  const text = value.trim()
  const words = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []
  const distinctWords = new Set(words.filter(word => word.length >= 3).map(word => word.toLocaleLowerCase('en-US')))
  return text.length >= 60
    && text.length <= 1_200
    && text.replace(/[^\p{L}\p{N}]/gu, '').length >= 40
    && words.length >= 10
    && distinctWords.size >= 6
    && (source === 'official-nysed' || EXPLANATION_REASONING_PATTERN.test(text))
    && !GENERIC_EXPLANATION_PATTERN.test(text)
    && !EXPLANATION_ARTIFACT_PATTERN.test(text)
}

function validDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function officialPdfUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'www.nysedregents.org'
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === ''
      && url.pathname.toLowerCase().endsWith('.pdf')
  } catch {
    return false
  }
}

function validImage(value: Omit<ElaQuestionImage, 'alt'> | undefined) {
  return !!value
    && typeof value.src === 'string'
    && value.src.startsWith('/vine-app/nysed/ela/')
    && Number.isInteger(value.width)
    && value.width > 0
    && Number.isInteger(value.height)
    && value.height > 0
}

function validPassageAsset(value: ElaPassageAsset | undefined) {
  return !!value
    && typeof value.src === 'string'
    && value.src.startsWith('/vine-app/nysed/ela/')
    && Number.isInteger(value.width)
    && value.width >= 420
    && Number.isInteger(value.height)
    && value.height >= 260
    && value.height <= 16_000
    && safeAlt(value.alt)
    && value.alt.length <= 600
    && Number.isInteger(value.pageCount)
    && value.pageCount >= 1
    && value.pageCount <= 4
}

function expectedSkillForStandard(standard: string): ElaSkill | null {
  const ccls = standard.match(CCLS_STANDARD_PATTERN)
  if (ccls) {
    if (ccls[1] === 'L') return 'language-vocabulary'
    const anchor = Number(ccls[3])
    if (anchor <= 3) return 'key-ideas-details'
    if (anchor <= 6) return 'craft-structure'
    return 'integration-knowledge'
  }

  const ngls = standard.match(NGLS_STANDARD_PATTERN)
  if (ngls) {
    if (ngls[2] === 'L') return 'language-vocabulary'
    const anchor = Number(ngls[3])
    if (anchor <= 3) return 'key-ideas-details'
    if (anchor <= 6) return 'craft-structure'
    return 'integration-knowledge'
  }
  return null
}

function validateStandard(
  standard: string,
  exam: RawElaExam,
  questionId: string,
  expectedSkill?: ElaSkill,
) {
  const ccls = standard.match(CCLS_STANDARD_PATTERN)
  const ngls = standard.match(NGLS_STANDARD_PATTERN)
  invariant(ccls || ngls, `${questionId} has a malformed standard ${standard}`)

  const framework = ccls ? 'CCLS' : 'NGLS'
  const standardGrade = Number(ccls?.[2] ?? ngls?.[1])
  invariant(framework === exam.standardsFramework, `${questionId} has a standard from the wrong framework`)
  invariant(standardGrade === exam.grade, `${questionId} has a standard for the wrong grade`)
  if (expectedSkill) {
    invariant(
      expectedSkillForStandard(standard) === expectedSkill,
      `${questionId} has a standard from the wrong ELA skill`,
    )
  }
}

function validatePassageReference(
  reference: RawElaPassageReference,
  exam: RawElaExam,
  stimulusId: string,
) {
  invariant(validText(reference?.label), `${stimulusId} has a passage reference without a label`)
  invariant(officialPdfUrl(reference?.sourceUrl), `${stimulusId} needs an official passage PDF URL`)
  invariant(reference.sourceUrl === exam.sourceUrl, `${stimulusId} passage URL must match its released booklet`)
  invariant(Number.isInteger(reference.pageStart) && reference.pageStart > 0, `${stimulusId} has a bad passage start page`)
  invariant(Number.isInteger(reference.pageEnd) && reference.pageEnd >= reference.pageStart, `${stimulusId} has a bad passage end page`)
}

function validateRawExam(exam: RawElaExam) {
  invariant(Number.isInteger(exam.year) && RELEASE_YEAR_SET.has(exam.year), `${exam.id} has a bad year`)
  invariant(isGradeLevel(exam.grade), `${exam.id} has a bad grade`)
  invariant(exam.id === `nysed-ela-${exam.year}-grade-${exam.grade}-mc-v1`, `bad exam id ${exam.id}`)
  invariant(exam.slug === `${exam.year}-grade-${exam.grade}-mc`, `bad exam slug ${exam.slug}`)
  invariant(exam.standardsFramework === 'CCLS' || exam.standardsFramework === 'NGLS', `${exam.id} has a bad framework`)
  invariant(
    exam.standardsFramework === (exam.year <= 2022 ? 'CCLS' : 'NGLS'),
    `${exam.id} has the wrong framework for its year`,
  )
  invariant(validText(exam.title), `${exam.id} needs a title`)
  invariant(validText(exam.description), `${exam.id} needs a description`)
  invariant(validText(exam.sourceTitle), `${exam.id} needs a source title`)
  invariant(officialPdfUrl(exam.sourceUrl), `${exam.id} needs an official released-question PDF URL`)

  const expectedCount = EXPECTED_COUNTS[exam.year as keyof typeof EXPECTED_COUNTS][exam.grade - 3]
  invariant(exam.questions.length === expectedCount, `${exam.id} must contain exactly ${expectedCount} multiple-choice questions`)
  invariant(Array.isArray(exam.stimuli) && exam.stimuli.length > 0, `${exam.id} needs passage stimuli`)

  const stimuliById = new Map<string, RawElaStimulus>()
  const passagePaths = new Set<string>()
  let priorQuestionEnd = 0
  for (const stimulus of exam.stimuli) {
    invariant(Number.isInteger(stimulus.questionStart) && stimulus.questionStart > 0, `${stimulus.id} has a bad question start`)
    invariant(Number.isInteger(stimulus.questionEnd) && stimulus.questionEnd >= stimulus.questionStart, `${stimulus.id} has a bad question end`)
    invariant(stimulus.questionStart > priorQuestionEnd, `${exam.id} has overlapping or unordered passage ranges`)
    invariant(
      stimulus.id === `nysed-ela-${exam.year}-g${exam.grade}-stimulus-${stimulus.questionStart}-${stimulus.questionEnd}`,
      `${stimulus.id} does not belong to ${exam.id}`,
    )
    invariant(!stimuliById.has(stimulus.id), `${exam.id} repeats stimulus ${stimulus.id}`)
    invariant(validText(stimulus.label), `${stimulus.id} needs a label`)
    invariant(Array.isArray(stimulus.references) && stimulus.references.length > 0, `${stimulus.id} needs at least one passage reference`)
    const referenceKeys = new Set<string>()
    for (const reference of stimulus.references) {
      validatePassageReference(reference, exam, stimulus.id)
      const key = `${reference.sourceUrl}|${reference.pageStart}|${reference.pageEnd}|${reference.label}`
      invariant(!referenceKeys.has(key), `${stimulus.id} repeats a passage reference`)
      referenceKeys.add(key)
    }
    invariant(validPassageAsset(stimulus.passage), `${stimulus.id} needs a valid local passage image`)
    const expectedPassagePath = `/vine-app/nysed/ela/${exam.year}/grade-${exam.grade}/en/passage-${stimulus.questionStart}-${stimulus.questionEnd}.webp`
    invariant(stimulus.passage.src === expectedPassagePath, `${stimulus.id} has the wrong passage image path`)
    invariant(!passagePaths.has(stimulus.passage.src), `${exam.id} repeats a passage image path`)
    passagePaths.add(stimulus.passage.src)
    const referencedPageCount = stimulus.references.reduce(
      (total, reference) => total + reference.pageEnd - reference.pageStart + 1,
      0,
    )
    invariant(stimulus.passage.pageCount === referencedPageCount, `${stimulus.id} has the wrong joined page count`)
    stimuliById.set(stimulus.id, stimulus)
    priorQuestionEnd = stimulus.questionEnd
  }

  const numbers = new Set<number>()
  const usedStimulusIds = new Set<string>()
  let previousNumber = 0
  for (const question of exam.questions) {
    invariant(Number.isInteger(question.number) && question.number > 0, `${question.id} has a bad number`)
    invariant(question.id === `nysed-ela-${exam.year}-g${exam.grade}-mc-q${question.number}`, `${question.id} does not belong to ${exam.id}`)
    invariant(!numbers.has(question.number), `${exam.id} repeats question ${question.number}`)
    invariant(question.number > previousNumber, `${exam.id} questions are not in source order`)
    numbers.add(question.number)
    previousNumber = question.number

    const numberKind = question.sourceNumberKind ?? 'official'
    invariant(numberKind === 'official' || numberKind === 'release-ordinal', `${question.id} has a bad number kind`)
    invariant(
      numberKind === 'release-ordinal'
        ? question.session === null
        : question.session === 1 || question.session === 2,
      `${question.id} has a bad session`,
    )
    invariant(Number.isInteger(question.sourcePage) && question.sourcePage > 0, `${question.id} has a bad source page`)
    invariant(SKILL_SET.has(question.skill), `${question.id} has a bad ELA skill`)
    validateStandard(question.primaryStandard, exam, question.id, question.skill)
    invariant(
      question.secondaryStandards === undefined
        || (Array.isArray(question.secondaryStandards) && question.secondaryStandards.every(validText)),
      `${question.id} has bad secondary standards`,
    )
    invariant(
      question.secondaryStandards === undefined
        || new Set(question.secondaryStandards).size === question.secondaryStandards.length,
      `${question.id} repeats a secondary standard`,
    )
    invariant(!question.secondaryStandards?.includes(question.primaryStandard), `${question.id} repeats its primary standard as secondary`)
    for (const standard of question.secondaryStandards ?? []) {
      validateStandard(standard, exam, question.id)
    }

    const stimulus = stimuliById.get(question.stimulusId)
    invariant(stimulus, `${question.id} references a missing stimulus`)
    invariant(
      question.number >= stimulus.questionStart && question.number <= stimulus.questionEnd,
      `${question.id} falls outside its passage question range`,
    )
    usedStimulusIds.add(question.stimulusId)

    invariant(['A', 'B', 'C', 'D'].includes(question.correct), `${question.id} has a bad answer key`)
    invariant(
      question.explanation?.source === 'official-nysed'
        || question.explanation?.source === 'vine-authored',
      `${question.id} has a bad explanation source`,
    )
    invariant(
      question.explanation.source === (exam.year <= 2014 ? 'official-nysed' : 'vine-authored'),
      `${question.id} has an explanation source that does not match its release`,
    )
    invariant(
      substantiveExplanation(question.explanation.text, question.explanation.source),
      `${question.id} needs a substantive, question-specific explanation`,
    )
    invariant(validImage(question.image), `${question.id} needs a question-only image`)
    const filename = `q${String(question.number).padStart(2, '0')}.webp`
    invariant(
      question.image.src === `/vine-app/nysed/ela/${exam.year}/grade-${exam.grade}/en/${filename}`,
      `${question.id} has the wrong image path`,
    )
    invariant(safeAlt(question.alt), `${question.id} needs safe, substantive alt text`)
  }

  invariant(usedStimulusIds.size === exam.stimuli.length, `${exam.id} has a passage stimulus without a multiple-choice question`)
}

function dominantSkill(questions: RawElaQuestion[]) {
  const counts = new Map<ElaSkill, number>()
  for (const question of questions) {
    counts.set(question.skill, (counts.get(question.skill) ?? 0) + 1)
  }
  return ELA_SKILL_ORDER.reduce((best, skill) =>
    (counts.get(skill) ?? 0) > (counts.get(best) ?? 0) ? skill : best,
  ELA_SKILL_ORDER[0])
}

export function buildElaExamCatalog(rawCatalog: RawElaExamCatalog) {
  invariant(rawCatalog && typeof rawCatalog === 'object', 'missing catalog')
  invariant(rawCatalog.schemaVersion === 3, 'unsupported schema version')
  invariant(typeof rawCatalog.generatedAt === 'string' && !Number.isNaN(Date.parse(rawCatalog.generatedAt)), 'bad generatedAt')
  invariant(validDateOnly(rawCatalog.accessedAt), 'bad accessedAt')
  invariant(validDateOnly(rawCatalog.sourceUpdatedAt), 'bad sourceUpdatedAt')
  invariant(rawCatalog.sourceIndexUrl === 'https://www.nysedregents.org/ei/ei-ela.html', 'bad source index')
  invariant(Array.isArray(rawCatalog.exams), 'missing exams')
  invariant(rawCatalog.exams.length === 78, 'catalog must contain exactly 78 exams')
  invariant(!LOCAL_FILESYSTEM_PATH_PATTERN.test(JSON.stringify(rawCatalog)), 'catalog exposes a local filesystem path')

  const accessedAt = rawCatalog.accessedAt
  const examIds = new Set<string>()
  const examSlugs = new Set<string>()
  const releasePairs = new Set<string>()
  const questionIds = new Set<string>()
  const questions: ElaExamQuestionRecord[] = []
  const explanationSourceCounts: Record<ElaExplanationSource, number> = {
    'official-nysed': 0,
    'vine-authored': 0,
  }

  const exams = rawCatalog.exams.map(rawExam => {
    validateRawExam(rawExam)
    invariant(!examIds.has(rawExam.id), `duplicate exam id ${rawExam.id}`)
    invariant(!examSlugs.has(rawExam.slug), `duplicate exam slug ${rawExam.slug}`)
    const releasePair = `${rawExam.year}-${rawExam.grade}`
    invariant(!releasePairs.has(releasePair), `duplicate year/grade release ${releasePair}`)
    examIds.add(rawExam.id)
    examSlugs.add(rawExam.slug)
    releasePairs.add(releasePair)

    const rawQuestionsByStimulus = new Map<string, RawElaQuestion[]>()
    for (const rawQuestion of rawExam.questions) {
      invariant(!questionIds.has(rawQuestion.id), `duplicate question id ${rawQuestion.id}`)
      questionIds.add(rawQuestion.id)
      const stimulus = rawExam.stimuli.find(item => item.id === rawQuestion.stimulusId)!
      const sectionSlug = `questions-${stimulus.questionStart}-${stimulus.questionEnd}`
      explanationSourceCounts[rawQuestion.explanation.source] += 1
      questions.push({
        id: rawQuestion.id,
        examId: rawExam.id,
        sectionSlug,
        stimulusId: rawQuestion.stimulusId,
        number: rawQuestion.number,
        numberKind: rawQuestion.sourceNumberKind ?? 'official',
        session: rawQuestion.session,
        sourcePage: rawQuestion.sourcePage,
        type: 'multiple-choice',
        points: 1,
        primaryStandard: rawQuestion.primaryStandard,
        secondaryStandards: rawQuestion.secondaryStandards,
        skill: rawQuestion.skill,
        image: { ...rawQuestion.image, alt: rawQuestion.alt.trim() },
        grading: {
          mode: 'choice',
          correct: rawQuestion.correct,
          explanation: rawQuestion.explanation.text.trim(),
          explanationSource: rawQuestion.explanation.source,
        },
      })
      const stimulusQuestions = rawQuestionsByStimulus.get(rawQuestion.stimulusId) ?? []
      stimulusQuestions.push(rawQuestion)
      rawQuestionsByStimulus.set(rawQuestion.stimulusId, stimulusQuestions)
    }

    const sections = rawExam.stimuli.map(stimulus => {
      const stimulusQuestions = rawQuestionsByStimulus.get(stimulus.id)!
      const skills = ELA_SKILL_ORDER.filter(skill => stimulusQuestions.some(question => question.skill === skill))
      const standards = [...new Set(stimulusQuestions.flatMap(question => [
        question.primaryStandard,
        ...(question.secondaryStandards ?? []),
      ]))]
      return buildElaExamSection({
        stimulusId: stimulus.id,
        passageLabel: stimulus.label,
        questionStart: stimulus.questionStart,
        questionEnd: stimulus.questionEnd,
        passage: stimulus.passage,
        passageReferences: stimulus.references,
        skills,
        standards,
        questionIds: stimulusQuestions.map(question => question.id),
      }, rawExam.grade, dominantSkill(stimulusQuestions))
    })

    const exam: ElaExamDefinition = {
      id: rawExam.id,
      slug: rawExam.slug,
      year: rawExam.year,
      grade: rawExam.grade,
      standardsFramework: rawExam.standardsFramework,
      title: rawExam.title,
      description: rawExam.description,
      sourceTitle: rawExam.sourceTitle,
      sourceUrl: rawExam.sourceUrl,
      accessedAt,
      sections,
    }
    return exam
  })

  for (const year of RELEASE_YEARS) {
    for (const grade of [3, 4, 5, 6, 7, 8] as const) {
      invariant(releasePairs.has(`${year}-${grade}`), `missing ${year} Grade ${grade} release`)
    }
  }
  invariant(questions.length === 1_583, 'catalog must contain exactly 1,583 multiple-choice questions')
  invariant(
    explanationSourceCounts['official-nysed'] === 149,
    'catalog must contain exactly 149 official NYSED rationales',
  )
  invariant(
    explanationSourceCounts['vine-authored'] === 1_434,
    'catalog must contain exactly 1,434 Vine-authored explanations',
  )

  exams.sort((a, b) => b.year - a.year || a.grade - b.grade)
  return { exams, questions }
}
