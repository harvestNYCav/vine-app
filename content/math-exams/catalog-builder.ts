import { isGradeLevel } from '@/lib/grade-levels'
import { buildMathExamSection, type MathDomainCode } from './domain-content'
import type {
  LocalizedText,
  MathExamChoice,
  MathExamDefinition,
  MathExamLanguage,
  MathExamQuestionImageVariant,
  MathExamQuestionRecord,
  MathExamQuestionNumberKind,
} from './types'
import type { GradeLevel } from '@/lib/grade-levels'

type RawQuestionImage = {
  en: MathExamQuestionImageVariant
  es?: MathExamQuestionImageVariant
}

type RawQuestion = {
  id: string
  number: number
  sourceNumberKind?: MathExamQuestionNumberKind
  session: 1 | 2 | null
  sourcePage: number
  primaryStandard: string
  secondaryStandards?: string[]
  domain: MathDomainCode
  correct: MathExamChoice
  image: RawQuestionImage
  alt?: {
    en: string
    es?: string
  }
}

type RawExam = {
  id: string
  slug: string
  year: number
  grade: GradeLevel
  standardsFramework: 'CCLS' | 'NGLS'
  title: LocalizedText
  description: LocalizedText
  sourceTitle: LocalizedText
  sourceUrl: { en: string; es?: string }
  supportedLanguages: MathExamLanguage[]
  questions: RawQuestion[]
}

export type RawMathExamCatalog = {
  schemaVersion: 1
  generatedAt: string
  accessedAt: string
  sourceUpdatedAt: string
  sourceIndexUrl: string
  exams: RawExam[]
}

const DOMAIN_CODES = new Set<MathDomainCode>([
  'OA', 'NBT', 'NF', 'MD', 'G', 'RP', 'NS', 'EE', 'F', 'SP',
])
const RELEASE_YEARS = new Set([2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026])
const SPANISH_RELEASE_YEARS = new Set([2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026])
const STANDARD_PATTERN = /^(CCSS|NGLS)\.Math\.Content\.(?:NY-)?([3-8])\.(OA|NBT|NF|MD|G|RP|NS|EE|F|SP)\.(?:[A-Z]\.)?\d+[a-z]?$/
const ANSWER_METADATA_PATTERN = /(?:\b(?:Key|Clave)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|\b(?:Primary|Aligned)\s+CCLS|\bMeasured(?:\s+CCLS)?\s*:?\s*(?:NY-)?[3-8]\.|\bMap\s+to\s+the\s+Standards|\bScoring\s+Rubric|\bSample\s+Response|\bR[uú]brica\s+de\s+puntuaci[oó]n|\bRespuesta\s+de\s+muestra)/i

const DOMAIN_ORDER: MathDomainCode[] = [
  'OA', 'NBT', 'NF', 'MD', 'RP', 'NS', 'EE', 'F', 'G', 'SP',
]

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid generated NYSED catalog: ${message}`)
}

function validLocalizedText(value: LocalizedText) {
  return typeof value?.en === 'string' && value.en.trim().length > 0
    && typeof value?.es === 'string' && value.es.trim().length > 0
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function substantiveAlt(value: unknown) {
  return validText(value) && value.replace(/[^\p{L}\p{N}]/gu, '').length >= 24
}

function safeAlt(value: unknown) {
  return typeof value === 'string'
    && substantiveAlt(value)
    && !ANSWER_METADATA_PATTERN.test(value)
}

function validateStandard(
  standard: string,
  exam: RawExam,
  questionId: string,
  expectedDomain?: MathDomainCode,
) {
  const match = standard.match(STANDARD_PATTERN)
  invariant(match, `${questionId} has a malformed standard ${standard}`)
  invariant(match[1] === 'NGLS' || !standard.includes('.NY-'), `${questionId} has a malformed CCLS standard`)
  const standardGrade = Number(match[2])
  // NYSED's released maps intentionally include supporting prerequisite
  // standards from the immediately preceding grade. Reject anything outside
  // the assessed grade and that one-year prerequisite band.
  invariant(
    standardGrade === exam.grade || standardGrade === exam.grade - 1,
    `${questionId} has a standard for the wrong grade`,
  )
  invariant(
    (exam.standardsFramework === 'CCLS' && match[1] === 'CCSS')
      || (exam.standardsFramework === 'NGLS' && match[1] === 'NGLS'),
    `${questionId} has a standard from the wrong framework`,
  )
  if (expectedDomain) {
    invariant(match[3] === expectedDomain, `${questionId} has a standard from the wrong domain`)
  }
}

function validImage(value: MathExamQuestionImageVariant | undefined) {
  return !!value
    && typeof value.src === 'string'
    && value.src.startsWith('/vine-app/nysed/math/')
    && Number.isInteger(value.width)
    && value.width > 0
    && Number.isInteger(value.height)
    && value.height > 0
}

function validDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function domainLabel(domain: MathDomainCode) {
  const labels: Record<MathDomainCode, string> = {
    OA: 'Operations and Algebraic Thinking',
    NBT: 'Number and Operations in Base Ten',
    NF: 'Number and Operations—Fractions',
    MD: 'Measurement and Data',
    G: 'Geometry',
    RP: 'Ratios and Proportional Relationships',
    NS: 'The Number System',
    EE: 'Expressions and Equations',
    F: 'Functions',
    SP: 'Statistics and Probability',
  }
  return labels[domain]
}

function sectionDomainForQuestion(grade: GradeLevel, domain: MathDomainCode): MathDomainCode {
  // A small number of Grade 6 released questions are aligned to the prior
  // grade's OA prerequisite standard. At Grade 6, that content continues in
  // Expressions & Equations, so keep the published standard while placing
  // the question in the corresponding Grade 6 learning section.
  return grade === 6 && domain === 'OA' ? 'EE' : domain
}

function validateRawExam(exam: RawExam) {
  invariant(Number.isInteger(exam.year) && RELEASE_YEARS.has(exam.year), `${exam.id} has a bad year`)
  invariant(isGradeLevel(exam.grade), `${exam.id} has a bad grade`)
  invariant(exam.id === `nysed-${exam.year}-grade-${exam.grade}-mc-v1`, `bad exam id ${exam.id}`)
  invariant(exam.slug === `${exam.year}-grade-${exam.grade}-mc`, `bad exam slug ${exam.slug}`)
  invariant(exam.standardsFramework === 'CCLS' || exam.standardsFramework === 'NGLS', `${exam.id} has a bad framework`)
  invariant(
    exam.standardsFramework === (exam.year <= 2022 ? 'CCLS' : 'NGLS'),
    `${exam.id} has the wrong framework for its year`,
  )
  invariant(validLocalizedText(exam.title), `${exam.id} needs a localized title`)
  invariant(validLocalizedText(exam.description), `${exam.id} needs a localized description`)
  invariant(validLocalizedText(exam.sourceTitle), `${exam.id} needs a localized source title`)
  invariant(typeof exam.sourceUrl?.en === 'string' && exam.sourceUrl.en.startsWith('https://www.nysedregents.org/'), `${exam.id} needs an official English source`)
  invariant(Array.isArray(exam.supportedLanguages) && exam.supportedLanguages[0] === 'en', `${exam.id} must support English`)
  invariant(exam.supportedLanguages.every(language => language === 'en' || language === 'es'), `${exam.id} has a bad language`)
  invariant(new Set(exam.supportedLanguages).size === exam.supportedLanguages.length, `${exam.id} repeats a language`)
  invariant(
    exam.supportedLanguages.includes('es') === SPANISH_RELEASE_YEARS.has(exam.year),
    `${exam.id} has the wrong official language availability`,
  )
  if (exam.supportedLanguages.includes('es')) {
    invariant(typeof exam.sourceUrl.es === 'string' && exam.sourceUrl.es.startsWith('https://www.nysedregents.org/'), `${exam.id} needs an official Spanish source`)
  } else {
    invariant(!exam.sourceUrl.es, `${exam.id} unexpectedly has a Spanish source`)
  }
  invariant(exam.questions.length > 0, `${exam.id} has no questions`)

  const numbers = new Set<number>()
  let previousNumber = 0
  for (const question of exam.questions) {
    invariant(Number.isInteger(question.number) && question.number > 0, `${question.id} has a bad number`)
    invariant(question.id === `nysed-${exam.year}-g${exam.grade}-mc-q${question.number}`, `${question.id} does not belong to ${exam.id}`)
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
    invariant(typeof question.primaryStandard === 'string' && question.primaryStandard.length > 0, `${question.id} needs a standard`)
    validateStandard(question.primaryStandard, exam, question.id, question.domain)
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
    invariant(
      !question.secondaryStandards?.includes(question.primaryStandard),
      `${question.id} repeats its primary standard as secondary`,
    )
    for (const standard of question.secondaryStandards ?? []) {
      validateStandard(standard, exam, question.id)
    }
    invariant(DOMAIN_CODES.has(question.domain), `${question.id} has a bad domain`)
    invariant(['A', 'B', 'C', 'D'].includes(question.correct), `${question.id} has a bad answer key`)
    invariant(validImage(question.image?.en), `${question.id} needs an English image`)
    const filename = `q${String(question.number).padStart(2, '0')}.webp`
    invariant(
      question.image.en.src === `/vine-app/nysed/math/${exam.year}/grade-${exam.grade}/en/${filename}`,
      `${question.id} has the wrong English image path`,
    )
    if (exam.supportedLanguages.includes('es')) {
      invariant(validImage(question.image?.es), `${question.id} needs a Spanish image`)
      invariant(
        question.image.es!.src === `/vine-app/nysed/math/${exam.year}/grade-${exam.grade}/es/${filename}`,
        `${question.id} has the wrong Spanish image path`,
      )
      invariant(safeAlt(question.alt?.es), `${question.id} needs safe, substantive Spanish alt text`)
    } else {
      invariant(!question.image?.es, `${question.id} unexpectedly has a Spanish image`)
    }
    invariant(safeAlt(question.alt?.en), `${question.id} needs safe, substantive English alt text`)
  }
}

export function buildMathExamCatalog(rawCatalog: RawMathExamCatalog) {
  invariant(rawCatalog && typeof rawCatalog === 'object', 'missing catalog')
  invariant(rawCatalog.schemaVersion === 1, 'unsupported schema version')
  invariant(typeof rawCatalog.generatedAt === 'string' && !Number.isNaN(Date.parse(rawCatalog.generatedAt)), 'bad generatedAt')
  invariant(validDateOnly(rawCatalog.accessedAt), 'bad accessedAt')
  invariant(validDateOnly(rawCatalog.sourceUpdatedAt), 'bad sourceUpdatedAt')
  invariant(rawCatalog.sourceIndexUrl === 'https://www.nysedregents.org/ei/ei-math.html', 'bad source index')
  invariant(Array.isArray(rawCatalog.exams), 'missing exams')

  const accessedAt = rawCatalog.accessedAt
  const examIds = new Set<string>()
  const examSlugs = new Set<string>()
  const questionIds = new Set<string>()
  const questions: MathExamQuestionRecord[] = []

  const exams = rawCatalog.exams.map(rawExam => {
    validateRawExam(rawExam)
    invariant(!examIds.has(rawExam.id), `duplicate exam id ${rawExam.id}`)
    invariant(!examSlugs.has(rawExam.slug), `duplicate exam slug ${rawExam.slug}`)
    examIds.add(rawExam.id)
    examSlugs.add(rawExam.slug)

    const byDomain = new Map<MathDomainCode, string[]>()
    for (const rawQuestion of rawExam.questions) {
      invariant(!questionIds.has(rawQuestion.id), `duplicate question id ${rawQuestion.id}`)
      questionIds.add(rawQuestion.id)
      const sectionDomain = sectionDomainForQuestion(rawExam.grade, rawQuestion.domain)
      const sectionSlug = buildMathExamSection(sectionDomain, rawExam.grade, []).slug
      const imageAlt: LocalizedText = {
        en: rawQuestion.alt!.en.trim(),
        es: rawQuestion.alt?.es?.trim()
          || `El ítem oficial ${rawQuestion.number} de matemáticas de NYSED para el grado ${rawExam.grade} solo está disponible en inglés.`,
      }
      questions.push({
        id: rawQuestion.id,
        examId: rawExam.id,
        sectionSlug,
        number: rawQuestion.number,
        numberKind: rawQuestion.sourceNumberKind ?? 'official',
        session: rawQuestion.session,
        sourcePage: rawQuestion.sourcePage,
        type: 'multiple-choice',
        points: 1,
        primaryStandard: rawQuestion.primaryStandard,
        secondaryStandards: rawQuestion.secondaryStandards,
        cluster: domainLabel(rawQuestion.domain),
        image: {
          en: rawQuestion.image.en,
          ...(rawQuestion.image.es ? { es: rawQuestion.image.es } : {}),
          alt: imageAlt,
        },
        grading: {
          mode: 'choice',
          correct: rawQuestion.correct,
          explanation: {
            en: `The official NYSED answer key identifies choice ${rawQuestion.correct} as the correct answer.`,
            es: `La clave oficial de respuestas de NYSED identifica la opción ${rawQuestion.correct} como la respuesta correcta.`,
          },
        },
      })
      const ids = byDomain.get(sectionDomain) ?? []
      ids.push(rawQuestion.id)
      byDomain.set(sectionDomain, ids)
    }

    const exam: MathExamDefinition = {
      id: rawExam.id,
      slug: rawExam.slug,
      year: rawExam.year,
      grade: rawExam.grade,
      standardsFramework: rawExam.standardsFramework,
      supportedLanguages: rawExam.supportedLanguages,
      title: rawExam.title,
      description: rawExam.description,
      sourceTitle: rawExam.sourceTitle,
      sourceUrl: rawExam.sourceUrl,
      accessedAt,
      sections: DOMAIN_ORDER.flatMap(domain => {
        const ids = byDomain.get(domain)
        return ids?.length ? [buildMathExamSection(domain, rawExam.grade, ids)] : []
      }),
    }
    return exam
  })

  exams.sort((a, b) => b.year - a.year || a.grade - b.grade)
  return { exams, questions }
}
