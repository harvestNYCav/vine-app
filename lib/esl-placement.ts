import type { Client } from '@libsql/client'
import { randomUUID } from 'crypto'
import {
  ESL_PLACEMENT_STAGES,
  ESL_PLACEMENT_VERSION,
  getEslLevel,
  type EslLevelId,
} from '@/content/esl-placement'
import { scorePlacement, type PlacementAnswers, type PlacementScore, type StageScore } from './esl-placement-score'

export { scorePlacement, type PlacementAnswers, type PlacementScore, type StageScore } from './esl-placement-score'

// One row per time a tutor gives the ESL placement test. A student can be re-tested; the latest
// row is their current level. `level` is the tutor's final call and `suggested_level` is what the
// score said, so the two can differ when the tutor overrides it. `basics_score` and `everyday_score`
// are the core scores (tiebreakers not included); the full breakdown is re-scored from `answers`.
// `reads_cards` is 1 if the student read the cards themself, 0 if the tutor read them aloud.
export const ESL_PLACEMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS esl_placements (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    tutor_id TEXT NOT NULL,
    date TEXT NOT NULL,
    test_version TEXT NOT NULL,
    answers TEXT NOT NULL,
    basics_score INTEGER NOT NULL,
    everyday_score INTEGER,
    suggested_level TEXT NOT NULL,
    level TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    reads_cards INTEGER,
    created_at INTEGER NOT NULL
  )
`

export const ESL_PLACEMENTS_INDEX_SQL =
  'CREATE INDEX IF NOT EXISTS idx_esl_placements_student ON esl_placements (student_id, created_at)'

export class InvalidPlacementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPlacementError'
    Object.setPrototypeOf(this, InvalidPlacementError.prototype)
  }
}

export interface PlacementInput {
  studentId: string
  answers: PlacementAnswers
  // The tutor's override. Null means use the suggested level.
  level: EslLevelId | null
  note: string
  // Whether the student read the cards on their own. Null if the tutor didn't say.
  readsCards: boolean | null
}

const KNOWN_ITEM_IDS = new Set(
  ESL_PLACEMENT_STAGES.flatMap(stage => [...stage.items, ...stage.tiebreakers].map(item => item.id)),
)

// Validates an untrusted request body, throwing InvalidPlacementError with a message fit to show
// the tutor. Unknown item ids are dropped.
export function parsePlacementInput(body: unknown): PlacementInput {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.studentId !== 'string' || !input.studentId) {
    throw new InvalidPlacementError('Missing studentId.')
  }
  if (typeof input.answers !== 'object' || input.answers === null || Array.isArray(input.answers)) {
    throw new InvalidPlacementError('Missing answers.')
  }
  const answers: PlacementAnswers = {}
  for (const [id, value] of Object.entries(input.answers)) {
    if (!KNOWN_ITEM_IDS.has(id)) continue
    if (typeof value !== 'boolean') throw new InvalidPlacementError('Each answer must be marked yes or no.')
    answers[id] = value
  }
  if (Object.keys(answers).length === 0) {
    throw new InvalidPlacementError('Mark at least one question before saving.')
  }
  let level: EslLevelId | null = null
  if (input.level !== null && input.level !== undefined && input.level !== '') {
    const found = typeof input.level === 'string' ? getEslLevel(input.level) : undefined
    if (!found) throw new InvalidPlacementError('Pick one of the levels.')
    level = found.id
  }
  if (input.readsCards !== null && input.readsCards !== undefined && typeof input.readsCards !== 'boolean') {
    throw new InvalidPlacementError('Say whether the student read the cards.')
  }
  const readsCards = typeof input.readsCards === 'boolean' ? input.readsCards : null
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 2000) : ''
  return { studentId: input.studentId, answers, level, note, readsCards }
}

export interface EslPlacement {
  id: string
  studentId: string
  tutorId: string
  tutorName: string | null
  date: string
  basicsScore: number
  everydayScore: number | null
  // Each stage reached, re-scored from the saved answers, including any tiebreakers.
  stages: StageScore[]
  suggestedLevel: EslLevelId
  level: EslLevelId
  note: string
  readsCards: boolean | null
  createdAt: number
}

// Saves a new placement for an existing student. Returns null if there is no such student.
export async function saveEslPlacement(
  db: Client,
  tutorId: string,
  date: string,
  input: PlacementInput,
  now: number = Date.now(),
): Promise<{ id: string; score: PlacementScore; level: EslLevelId } | null> {
  const score = scorePlacement(input.answers)
  const level = input.level ?? score.suggestedLevel
  const stageScore = (stageId: string) => score.stages.find(stage => stage.stageId === stageId)?.coreCorrect ?? null
  const id = randomUUID()
  const result = await db.execute({
    sql: `
      INSERT INTO esl_placements (
        id, student_id, tutor_id, date, test_version, answers, basics_score, everyday_score,
        suggested_level, level, note, reads_cards, created_at
      )
      SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM users WHERE id = ? AND role = 'student'
    `,
    args: [
      id, tutorId, date, ESL_PLACEMENT_VERSION, JSON.stringify(input.answers), stageScore('basics') ?? 0,
      stageScore('everyday'), score.suggestedLevel, level, input.note,
      input.readsCards === null ? null : input.readsCards ? 1 : 0, now, input.studentId,
    ],
  })
  if (result.rowsAffected === 0) return null
  return { id, score, level }
}

// The student's most recent placement, or null if they have never been placed.
export async function getLatestEslPlacement(db: Client, studentId: string): Promise<EslPlacement | null> {
  const result = await db.execute({
    sql: `
      SELECT p.*, u.name AS tutor_name
      FROM esl_placements p
      LEFT JOIN users u ON u.id = p.tutor_id
      WHERE p.student_id = ?
      ORDER BY p.created_at DESC, p.rowid DESC
      LIMIT 1
    `,
    args: [studentId],
  })
  const row = result.rows[0]
  if (!row) return null
  let answers: PlacementAnswers = {}
  try {
    answers = JSON.parse(String(row.answers)) as PlacementAnswers
  } catch {
    // A corrupt row still shows its stored level; it just has no breakdown.
  }
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    tutorId: String(row.tutor_id),
    tutorName: row.tutor_name === null ? null : String(row.tutor_name),
    date: String(row.date),
    basicsScore: Number(row.basics_score),
    everydayScore: row.everyday_score === null ? null : Number(row.everyday_score),
    stages: scorePlacement(answers).stages,
    suggestedLevel: String(row.suggested_level) as EslLevelId,
    level: String(row.level) as EslLevelId,
    note: String(row.note),
    readsCards: row.reads_cards === null || row.reads_cards === undefined ? null : Number(row.reads_cards) === 1,
    createdAt: Number(row.created_at),
  }
}
