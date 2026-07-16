import 'server-only'

import rawCatalog from './generated/catalog.json'
import { buildElaExamCatalog, type RawElaExamCatalog } from './catalog-builder'

const catalog = buildElaExamCatalog(rawCatalog as unknown as RawElaExamCatalog)

export const ELA_EXAMS = catalog.exams
export const ELA_EXAM_QUESTIONS = catalog.questions
