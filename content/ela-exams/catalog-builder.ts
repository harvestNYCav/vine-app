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
  ElaPassageTranscriptSource,
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
  schemaVersion: 4
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
const CORRECTED_OFFICIAL_RATIONALE_IDS = new Set([
  'nysed-ela-2013-g4-mc-q2',
  'nysed-ela-2014-g3-mc-q12',
])
const SKILL_SET = new Set<ElaSkill>(ELA_SKILL_ORDER)
const CCLS_STANDARD_PATTERN = /^CCSS\.ELA-Literacy\.(RL|RI|L)\.([3-8])\.([1-9])([a-z])?$/
const NGLS_STANDARD_PATTERN = /^NGLS\.ELA\.Content\.NY-([3-8])(R|L)([1-9])([a-z])?$/
const ANSWER_METADATA_PATTERN = /(?:\bKey\s*:\s*[A-D]\b|\bCorrect\s+(?:Answer|Response)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|\b(?:Primary|Secondary|Aligned)\s+(?:CCLS|Standard)|\bMeasured(?:\s+CCLS)?\s*:|\bMap\s+to\s+the\s+Standards|\bScoring\s+Rubric|\bSample\s+Response|\bAnnotated\s+(?:Item|Response))/i
const EXPLANATION_REASONING_PATTERN = /\b(?:because|since|therefore|thus|consequently|so|as\s+a\s+result|which\s+(?:show(?:s|ed|ing)?|means?|indicates?|demonstrates?|reveals?|explains?)|(?:this|that)\s+(?:show(?:s|ed|ing)?|means?|indicates?|supports?|demonstrates?|reveals?|explains?)|show(?:s|ed|ing)?|means?|illustrat(?:e|es|ed|ing)|suggest(?:s|ed|ing)?|clarif(?:y|ies|ied)|supports?|supported\s+by|evidence|demonstrates?|indicates?|reveals?|explains?|confirms?|contradicts?|connect(?:s|ed|ing)?|identif(?:y|ies|ied)|recogniz(?:e|es|ed)|understand(?:s|ing)?|deduc(?:e|es|ed)|determin(?:e|es|ed)|infer(?:s|red|ring)?|interpret(?:s|ed|ing)?|rel(?:y|ies|ied)|uses?|contribut(?:e|es|ed|ing))\b/i
const GENERIC_EXPLANATION_PATTERN = /(?:\b(?:official\s+)?(?:nysed\s+)?answer\s+key\b|\baccording\s+to\s+(?:the\s+)?(?:official\s+)?(?:answer|key)\b|\bidentifies\s+choice\s+[A-D]\s+as\s+the\s+correct\s+answer\b|\bbecause\s+(?:it|this|that|choice\s+[A-D])\s+is\s+(?:the\s+)?(?:correct|right)\s+(?:answer|choice|response)\b|^(?:the\s+)?(?:correct|right)\s+answer\s+is\s+(?:choice\s+)?[A-D][.!]?$|^choice\s+[A-D]\s+is\s+(?:correct|right)[.!]?$)/i
const EXPLANATION_ARTIFACT_PATTERN = /(?:\bWHY\s+(?:CHOICE|ANSWER)\b|\bWHY\s+(?:THE\s+)?OTHER\s+(?:CHOICES|ANSWERS|RESPONSES)\b|\bHOW\s+TO\s+HELP\s+STUDENTS\b|\bINSTRUCTIONAL\s+(?:SUGGESTIONS?|IMPLICATIONS?)\b|\bQUESTION\s+ANNOTATION\b|[.!?”’]\s+\d{1,3}$)/i
const LOCAL_FILESYSTEM_PATH_PATTERN = /(?:file:\/\/|\/(?:Users|home|private|tmp|root|workspace|workspaces|var)\/|[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)/i
const TRANSCRIPT_SOURCE_SET = new Set<ElaPassageTranscriptSource>([
  'official-pdf-text',
  'mixed-official-pdf-text-and-ocr',
  'passage-image-ocr',
])
const TRANSCRIPT_CHROME_PATTERN = /(?:^\s*(?:GO\s*ON|STOP)\s*$|\bSession\s+\d+\s+Page\s+\d+\b|\bPage\s+\d+\s+Session\s+\d+\b)/im
const TRANSCRIPT_ANSWER_LEAK_PATTERN = /(?:\bAnswer\s+Key\b|\bCorrect\s+(?:Answer|Response)\b|\bWHY\s+CHOICE\b|\bScoring\s+Rubric\b|\bAnnotated\s+Item\b|\b(?:Answer|Response|Key)\s*(?::|\bis\b)\s*[A-D]\b|\b(?:the\s+)?correct\s+(?:choice|option|answer|response)\s*(?::|\bis\b)\s*[A-D]\b|\b(?:Choice|Option)\s+[A-D]\s+(?:is|was|would\s+be)\s+(?:correct|right|best|accurate)\b|\b(?:Clave|Respuesta(?:\s+correcta)?)\s*(?::|\bes\b)\s*[A-D]\b|\b(?:La\s+)?(?:opci[oó]n|alternativa|respuesta)\s+[A-D]\s+es\s+(?:correcta|acertada|la\s+mejor)\b)/i
const TRANSCRIPT_OCR_CORRUPTION_PATTERN = /(?:\bDivcions\b|\bcartt\b|\b[JT]\s+don['’]t\b|\bT[’']{1,2}m\b|\bTt[’']?s\b|\bLam\s+responsible\b|\byoud\b|[“"']ll\s+get\b|[:;][’'](?=\s|$)|‘(?:The|They)\b|=\s*=\s*SS\b|—{2}\s*=)/i
// Match the narrow, source-reviewed split-run classes emitted by NYSED's
// embedded PDF fonts. The explicit lookbehinds preserve the genuine phrase
// “sci-fi fishland” while rejecting forms such as “Th e” and “fi eld.”
const TRANSCRIPT_SPLIT_WORD_OCR_PATTERN = /(?:\bTh\s+(?:e|at|en|ere|ese|ey|eir|is|ough)\b|\b(?:Aft|aft)\s+(?:er|ernoon)\b|\b(?:C\s+oral|F\s+ire|I\s+nterference|O\s+ne-Eyed)\b|\b\d+f\s+rappé(?![\p{L}\p{N}_])|(?<!sci-)(?<!Sci-)\b[A-Za-z]*(?:fi|fl)\s+[a-z]+\b|\b(?:stuff\s+ed|soft\s+en|drift\s+ed|heft\s+ing|diff\s+erent|off\s+er|eff\s+ective|refl\s+ect)\b)/u
const TRANSCRIPT_DOUBLED_CHARACTER_TOKEN_PATTERN = /\b[A-Za-z][A-Za-z-]*[A-Za-z]\b/g
const TRANSCRIPT_DOUBLED_CHARACTER_LAYOUT_PATTERN = /(?:““|””|::|\bThThee\b|\b4400\b)/
const ALLOWED_EXPRESSIVE_REPEAT_TOKENS = new Set(['Snoozzzzzze', 'go-rillllllas'])
const TRANSCRIPT_SINGLE_CLOSING_QUOTE_PATTERN = /[,!?.]’/
const ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS: Readonly<Record<string, readonly string[]>> = {
  'nysed-ela-2014-g5-stimulus-15-21': [
    'which means ‘very small.’',
    'head ‘no,’ but',
  ],
  'nysed-ela-2015-g5-stimulus-8-13': ['‘We’ll all go this time.’ ”'],
  'nysed-ela-2017-g8-stimulus-29-35': [
    'anymore.’ And I took',
    '‘Baby, yes, you can see.’ I said',
    'see with your hands.’ And then',
    'hands and your nose and your ears.’ ”',
  ],
  'nysed-ela-2019-g8-stimulus-29-35': [
    '‘new woman.’ She',
    '‘eternal feminine,’ who',
  ],
  'nysed-ela-2018-g7-stimulus-15-21': [
    '‘eat\nmore, eat more,’” explains',
  ],
  'nysed-ela-2021-g6-stimulus-8-14': [
    'that ‘nearby\nnature,’” Louv',
  ],
  'nysed-ela-2021-g7-stimulus-8-14': [
    '‘eat\nmore, eat more,’” explains',
  ],
  'nysed-ela-2021-g8-stimulus-22-28': [
    '‘new woman.’ She',
    '‘eternal feminine,’ who',
  ],
  'nysed-ela-2022-g6-stimulus-8-14': ['out where they go,’ ” remembers'],
  'nysed-ela-2023-g7-stimulus-36-42': [
    'win the election.’\n3 “I',
    'the truth all this time.’ ”',
    '‘You were right.’ ”',
    'paper.’ ”',
  ],
  'nysed-ela-2023-g8-stimulus-29-35': [
    '‘What the . . .’ He',
    'excited.’\n_',
  ],
  'nysed-ela-2025-g6-stimulus-8-14': ['‘This is it!’ because'],
  'nysed-ela-2026-g7-stimulus-29-35': [
    'animals. ‘That’s where you’re needed,’ he',
    '‘Mr. Zuo’s\nwaterwheels.’” Chengli',
  ],
  'nysed-ela-2017-g3-stimulus-25-31': ['‘you have to slow down.’ ”'],
  'nysed-ela-2019-g4-stimulus-19-24': ['Send him over.’ Then'],
  'nysed-ela-2023-g3-stimulus-26-31': ['‘thunderstorm,’ ”'],
  'nysed-ela-2025-g3-stimulus-1-6': ['‘Paint Out!’ Sounds'],
  'nysed-ela-2026-g3-stimulus-20-24': [
    'vote ‘no,’ there',
    '‘Save Our Zoo!’ with',
  ],
}
const TRANSCRIPT_MARKER_PATTERN = /^\s*(\d{1,3})\s+(?:[1-6]\.\s+)?(?=[A-Za-z“"‘'•(\[])/
const VISUAL_DESCRIPTION_PATTERN = /^\[(?:Illustration|Diagram|Photograph|Map|Chart|Text box|Sidebar|Caption):\s+\S.+\]$/im
const REQUIRED_VISUAL_DESCRIPTION_COUNTS: Readonly<Record<string, number>> = {
  'nysed-ela-2014-g3-stimulus-1-4': 2,
  'nysed-ela-2014-g3-stimulus-10-16': 2,
  'nysed-ela-2014-g4-stimulus-12-17': 1,
  'nysed-ela-2017-g3-stimulus-19-24': 3,
  'nysed-ela-2017-g4-stimulus-25-31': 2,
  'nysed-ela-2018-g3-stimulus-1-6': 1,
  'nysed-ela-2019-g3-stimulus-7-12': 2,
  'nysed-ela-2019-g4-stimulus-13-18': 4,
  'nysed-ela-2021-g3-stimulus-7-12': 2,
  'nysed-ela-2023-g4-stimulus-26-31': 2,
  'nysed-ela-2024-g4-stimulus-1-6': 1,
  'nysed-ela-2024-g4-stimulus-26-31': 2,
  'nysed-ela-2025-g4-stimulus-1-6': 1,
  'nysed-ela-2026-g3-stimulus-13-19': 4,
  'nysed-ela-2026-g4-stimulus-26-31': 1,
  // Independently enumerated from every Grade 5–8 passage facsimile and its
  // released multiple-choice stems. The ledger includes every question-
  // dependent visual plus six adopted structured-accessibility enhancements.
  'nysed-ela-2014-g5-stimulus-8-14': 1,
  'nysed-ela-2014-g7-stimulus-13-19': 2,
  'nysed-ela-2015-g6-stimulus-1-7': 1,
  'nysed-ela-2015-g7-stimulus-1-7': 1,
  'nysed-ela-2015-g7-stimulus-15-21': 1,
  'nysed-ela-2016-g8-stimulus-36-42': 1,
  'nysed-ela-2017-g5-stimulus-1-7': 1,
  'nysed-ela-2017-g5-stimulus-36-42': 1,
  'nysed-ela-2018-g5-stimulus-29-35': 1,
  'nysed-ela-2018-g6-stimulus-29-35': 1,
  'nysed-ela-2019-g6-stimulus-29-35': 2,
  'nysed-ela-2021-g6-stimulus-8-14': 1,
  'nysed-ela-2021-g6-stimulus-22-28': 1,
  'nysed-ela-2022-g5-stimulus-29-35': 1,
  'nysed-ela-2023-g6-stimulus-22-26': 1,
  'nysed-ela-2024-g6-stimulus-15-21': 1,
  'nysed-ela-2024-g5-stimulus-22-26': 1,
  'nysed-ela-2025-g5-stimulus-29-35': 1,
  'nysed-ela-2025-g6-stimulus-8-14': 1,
  'nysed-ela-2025-g6-stimulus-22-26': 1,
  'nysed-ela-2026-g5-stimulus-15-21': 1,
  'nysed-ela-2026-g5-stimulus-22-27': 1,
  'nysed-ela-2026-g6-stimulus-22-27': 1,
}

function hasUnexpectedSingleClosingQuote(text: string, stimulusId: string) {
  let masked = text
  for (const fragment of ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS[stimulusId] ?? []) {
    if (masked.split(fragment).length > 2) return true
    masked = masked.replace(fragment, fragment.replaceAll('’', "'"))
  }
  return TRANSCRIPT_SINGLE_CLOSING_QUOTE_PATTERN.test(masked)
}

function hasDoubledCharacterExtraction(text: string) {
  if (TRANSCRIPT_DOUBLED_CHARACTER_LAYOUT_PATTERN.test(text)) return true
  for (const match of text.matchAll(TRANSCRIPT_DOUBLED_CHARACTER_TOKEN_PATTERN)) {
    const token = match[0]
    if (ALLOWED_EXPRESSIVE_REPEAT_TOKENS.has(token)) continue
    for (const component of token.split('-')) {
      if (component.length % 2 !== 0) continue
      const pairCount = component.length / 2
      const doubledPairCount = Array.from({ length: pairCount }).filter((_, pairIndex) => {
        const index = pairIndex * 2
        return component[index] === component[index + 1]
      }).length
      if (component.length >= 4 && doubledPairCount === pairCount) return true
      if (
        component.length >= 8
        && doubledPairCount >= 3
        && doubledPairCount / pairCount >= 0.6
      ) return true
    }
  }
  return false
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid generated NYSED ELA catalog: ${message}`)
}

function hasExactObjectKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  const allowed = new Set([...required, ...optional])
  return required.every(key => Object.prototype.hasOwnProperty.call(value, key))
    && keys.every(key => allowed.has(key))
}

export function transcriptParagraphMarkers(text: string) {
  const candidates = text.split('\n').flatMap(line => {
    const match = line.match(TRANSCRIPT_MARKER_PATTERN)
    return match ? [Number(match[1])] : []
  })
  if (candidates.length === 0) return []

  // Match the authoring validator exactly: numeric prose, table values, and
  // captions can look like markers, so retain the first longest increasing
  // subsequence rather than rejecting an otherwise reviewed passage.
  const best: number[][] = []
  for (let index = 0; index < candidates.length; index += 1) {
    let prior: number[] = []
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      if (candidates[priorIndex] < candidates[index] && best[priorIndex].length > prior.length) {
        prior = best[priorIndex]
      }
    }
    best.push([...prior, candidates[index]])
  }
  return best.reduce((longest, sequence) => sequence.length > longest.length ? sequence : longest)
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function containsLocalFilesystemPath(value: unknown): boolean {
  if (typeof value === 'string') return LOCAL_FILESYSTEM_PATH_PATTERN.test(value)
  if (Array.isArray(value)) return value.some(containsLocalFilesystemPath)
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, nested]) =>
      LOCAL_FILESYSTEM_PATH_PATTERN.test(key) || containsLocalFilesystemPath(nested),
    )
  }
  return false
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
    && hasExactObjectKeys(value, ['src', 'width', 'height'])
    && typeof value.src === 'string'
    && value.src.startsWith('/vine-app/nysed/ela/')
    && Number.isInteger(value.width)
    && value.width > 0
    && Number.isInteger(value.height)
    && value.height > 0
}

function validPassageTranscript(value: ElaPassageAsset['transcript'] | undefined, stimulusId: string) {
  if (!value
    || !hasExactObjectKeys(value, ['text', 'source', 'sourcePdfSha256', 'passageImageSha256'])
    || !validText(value.text)
    || value.text.length < 400
    || value.text.length > 20_000
    || !TRANSCRIPT_SOURCE_SET.has(value.source)
    || !/^[0-9a-f]{64}$/.test(value.sourcePdfSha256)
    || !/^[0-9a-f]{64}$/.test(value.passageImageSha256)
    || value.text !== value.text.normalize('NFC')
    || /[\uE000-\uF8FF]/u.test(value.text)
    || LOCAL_FILESYSTEM_PATH_PATTERN.test(value.text)
    || TRANSCRIPT_CHROME_PATTERN.test(value.text)
    || TRANSCRIPT_ANSWER_LEAK_PATTERN.test(value.text)
    || TRANSCRIPT_OCR_CORRUPTION_PATTERN.test(value.text)
    || TRANSCRIPT_SPLIT_WORD_OCR_PATTERN.test(value.text)
    || hasDoubledCharacterExtraction(value.text)
    || hasUnexpectedSingleClosingQuote(value.text, stimulusId)
  ) return false
  const words = value.text.match(/[A-Za-z0-9]+/g) ?? []
  if (words.length < 80 || transcriptParagraphMarkers(value.text).length < 3) {
    return false
  }
  const visualDescriptionCount = value.text
    .split('\n')
    .filter(line => VISUAL_DESCRIPTION_PATTERN.test(line.trim())).length
  const requiredVisualDescriptionCount = REQUIRED_VISUAL_DESCRIPTION_COUNTS[stimulusId]
  if (
    requiredVisualDescriptionCount !== undefined
    && visualDescriptionCount !== requiredVisualDescriptionCount
  ) {
    return false
  }
  return true
}

function validPassageAsset(value: ElaPassageAsset | undefined, stimulusId: string) {
  return !!value
    && hasExactObjectKeys(value, ['src', 'width', 'height', 'alt', 'pageCount', 'transcript'])
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
    && validPassageTranscript(value.transcript, stimulusId)
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
  invariant(
    hasExactObjectKeys(reference, ['label', 'sourceUrl', 'pageStart', 'pageEnd']),
    `${stimulusId} has a passage reference with unexpected keys`,
  )
  invariant(validText(reference?.label), `${stimulusId} has a passage reference without a label`)
  invariant(officialPdfUrl(reference?.sourceUrl), `${stimulusId} needs an official passage PDF URL`)
  invariant(reference.sourceUrl === exam.sourceUrl, `${stimulusId} passage URL must match its released booklet`)
  invariant(Number.isInteger(reference.pageStart) && reference.pageStart > 0, `${stimulusId} has a bad passage start page`)
  invariant(Number.isInteger(reference.pageEnd) && reference.pageEnd >= reference.pageStart, `${stimulusId} has a bad passage end page`)
}

function validateRawExam(exam: RawElaExam) {
  invariant(hasExactObjectKeys(exam, [
    'id',
    'slug',
    'year',
    'grade',
    'standardsFramework',
    'title',
    'description',
    'sourceTitle',
    'sourceUrl',
    'stimuli',
    'questions',
  ]), `${exam?.id ?? 'exam'} has unexpected keys`)
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

  invariant(Array.isArray(exam.stimuli) && exam.stimuli.length > 0, `${exam.id} needs passage stimuli`)
  invariant(Array.isArray(exam.questions), `${exam.id} needs multiple-choice questions`)
  const expectedCount = EXPECTED_COUNTS[exam.year as keyof typeof EXPECTED_COUNTS][exam.grade - 3]
  invariant(exam.questions.length === expectedCount, `${exam.id} must contain exactly ${expectedCount} multiple-choice questions`)

  const stimuliById = new Map<string, RawElaStimulus>()
  const passagePaths = new Set<string>()
  let priorQuestionEnd = 0
  for (const stimulus of exam.stimuli) {
    invariant(hasExactObjectKeys(stimulus, [
      'id',
      'label',
      'questionStart',
      'questionEnd',
      'passage',
      'references',
    ]), `${stimulus?.id ?? exam.id} has unexpected keys`)
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
    invariant(validPassageAsset(stimulus.passage, stimulus.id), `${stimulus.id} needs a valid local passage image and required transcript`)
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
    invariant(hasExactObjectKeys(question, [
      'id',
      'number',
      'session',
      'sourcePage',
      'primaryStandard',
      'stimulusId',
      'skill',
      'correct',
      'explanation',
      'image',
      'alt',
    ], ['sourceNumberKind', 'secondaryStandards']), `${question?.id ?? exam.id} has unexpected keys`)
    invariant(
      hasExactObjectKeys(question.explanation, ['text', 'source']),
      `${question.id} has an explanation with unexpected keys`,
    )
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
        || question.explanation?.source === 'official-nysed-corrected'
        || question.explanation?.source === 'vine-authored',
      `${question.id} has a bad explanation source`,
    )
    const expectedExplanationSource: ElaExplanationSource = exam.year >= 2015
      ? 'vine-authored'
      : CORRECTED_OFFICIAL_RATIONALE_IDS.has(question.id)
        ? 'official-nysed-corrected'
        : 'official-nysed'
    invariant(
      question.explanation.source === expectedExplanationSource,
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

function sectionFocusSkill(questions: RawElaQuestion[]) {
  // The lesson immediately precedes this section's questions, so align it to
  // the first skill students will practice. Using the numerically dominant
  // skill hid Integration and Vocabulary lessons whenever a passage also had
  // several Key Ideas questions.
  return questions[0].skill
}

export function buildElaExamCatalog(rawCatalog: RawElaExamCatalog) {
  invariant(rawCatalog && typeof rawCatalog === 'object', 'missing catalog')
  invariant(hasExactObjectKeys(rawCatalog, [
    'schemaVersion',
    'generatedAt',
    'accessedAt',
    'sourceUpdatedAt',
    'sourceIndexUrl',
    'exams',
  ]), 'catalog has unexpected keys')
  invariant(rawCatalog.schemaVersion === 4, 'unsupported schema version')
  invariant(typeof rawCatalog.generatedAt === 'string' && !Number.isNaN(Date.parse(rawCatalog.generatedAt)), 'bad generatedAt')
  invariant(validDateOnly(rawCatalog.accessedAt), 'bad accessedAt')
  invariant(validDateOnly(rawCatalog.sourceUpdatedAt), 'bad sourceUpdatedAt')
  invariant(rawCatalog.sourceIndexUrl === 'https://www.nysedregents.org/ei/ei-ela.html', 'bad source index')
  invariant(Array.isArray(rawCatalog.exams), 'missing exams')
  invariant(rawCatalog.exams.length === 78, 'catalog must contain exactly 78 exams')
  invariant(!containsLocalFilesystemPath(rawCatalog), 'catalog exposes a local filesystem path')

  const accessedAt = rawCatalog.accessedAt
  const examIds = new Set<string>()
  const examSlugs = new Set<string>()
  const releasePairs = new Set<string>()
  const questionIds = new Set<string>()
  const questions: ElaExamQuestionRecord[] = []
  const explanationSourceCounts: Record<ElaExplanationSource, number> = {
    'official-nysed': 0,
    'official-nysed-corrected': 0,
    'vine-authored': 0,
  }
  let transcriptStimulusCount = 0
  let transcriptQuestionCount = 0

  const exams = rawCatalog.exams.map(rawExam => {
    validateRawExam(rawExam)
    transcriptStimulusCount += rawExam.stimuli.length
    transcriptQuestionCount += rawExam.questions.length
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
      const transcript = stimulus.passage.transcript!
      return buildElaExamSection({
        stimulusId: stimulus.id,
        passageLabel: stimulus.label,
        questionStart: stimulus.questionStart,
        questionEnd: stimulus.questionEnd,
        passage: {
          src: stimulus.passage.src,
          width: stimulus.passage.width,
          height: stimulus.passage.height,
          alt: stimulus.passage.alt,
          pageCount: stimulus.passage.pageCount,
          transcript: {
            text: transcript.text,
            source: transcript.source,
            sourcePdfSha256: transcript.sourcePdfSha256,
            passageImageSha256: transcript.passageImageSha256,
          },
        },
        passageReferences: stimulus.references.map(reference => ({
          label: reference.label,
          sourceUrl: reference.sourceUrl,
          pageStart: reference.pageStart,
          pageEnd: reference.pageEnd,
        })),
        skills,
        standards,
        questionIds: stimulusQuestions.map(question => question.id),
      }, rawExam.grade, sectionFocusSkill(stimulusQuestions))
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
  invariant(transcriptStimulusCount === 242, 'catalog must contain exactly 242 reviewed Grade 3–8 passage transcripts')
  invariant(transcriptQuestionCount === 1_583, 'reviewed Grade 3–8 transcripts must cover exactly 1,583 questions')
  invariant(
    explanationSourceCounts['official-nysed'] === 147,
    'catalog must contain exactly 147 unmodified official NYSED rationales',
  )
  invariant(
    explanationSourceCounts['official-nysed-corrected'] === 2,
    'catalog must contain exactly 2 official NYSED rationales corrected by Vine',
  )
  invariant(
    explanationSourceCounts['vine-authored'] === 1_434,
    'catalog must contain exactly 1,434 Vine-authored explanations',
  )

  exams.sort((a, b) => b.year - a.year || a.grade - b.grade)
  return { exams, questions }
}
