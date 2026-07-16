import 'server-only'

import rawCatalog from './generated/catalog.json'
import { buildMathExamCatalog, type RawMathExamCatalog } from './catalog-builder'

const catalog = buildMathExamCatalog(rawCatalog as unknown as RawMathExamCatalog)

export const MATH_EXAMS = catalog.exams
export const MATH_EXAM_QUESTIONS = catalog.questions
