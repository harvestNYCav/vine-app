import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { ESL_LEVELS, ESL_PLACEMENT_STAGES } from '../content/esl-placement'
import { ALL_MODULES, getModule } from '../content/modules'
import {
  ESL_PLACEMENTS_INDEX_SQL,
  ESL_PLACEMENTS_TABLE_SQL,
  getLatestEslPlacement,
  InvalidPlacementError,
  parsePlacementInput,
  saveEslPlacement,
  scorePlacement,
} from '../lib/esl-placement'
import { scoreStage } from '../lib/esl-placement-score'

const [basics, everyday] = ESL_PLACEMENT_STAGES

// Marks the first `count` core items of a stage as passed and the rest as not passed.
function marks(stage: typeof basics, count: number): Record<string, boolean> {
  return Object.fromEntries(stage.items.map((item, index) => [item.id, index < count]))
}

// The same for a stage's tiebreakers.
function tiebreaks(stage: typeof basics, count: number): Record<string, boolean> {
  return Object.fromEntries(stage.tiebreakers.map((item, index) => [item.id, index < count]))
}

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-esl-placement-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
      INSERT INTO users VALUES ('maria', 'Maria', 'student'), ('sarah', 'Sarah', 'tutor');
    `)
    await db.execute(ESL_PLACEMENTS_TABLE_SQL)
    await db.execute(ESL_PLACEMENTS_INDEX_SQL)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

test('every level starts at a real ESL lesson, in course order', () => {
  const eslSlugs = ESL_LEVELS.map(level => {
    const module = getModule(level.startModuleSlug)
    assert.ok(module, `${level.startModuleSlug} is not a module`)
    assert.equal(module.track, 'esl')
    return level.startModuleSlug
  })
  const positions = eslSlugs.map(slug => ALL_MODULES.findIndex(module => module.slug === slug))
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
  assert.equal(new Set(eslSlugs).size, eslSlugs.length)
  assert.equal(ESL_LEVELS.length, ESL_PLACEMENT_STAGES.length + 1)
})

test('item ids are unique and every pass mark is reachable', () => {
  const ids = ESL_PLACEMENT_STAGES.flatMap(stage => [...stage.items, ...stage.tiebreakers].map(item => item.id))
  assert.equal(new Set(ids).size, ids.length)
  for (const stage of ESL_PLACEMENT_STAGES) {
    assert.ok(stage.passMark > 0 && stage.passMark <= stage.items.length)
    assert.ok(stage.tiebreakers.length > 0)
    // A close call one below the pass mark can still pass, and one on it can still fail.
    assert.ok(stage.passMark - 1 + stage.tiebreakers.length >= stage.tiebreakPassMark)
    assert.ok(stage.passMark < stage.tiebreakPassMark)
  }
})

test('placement follows how many stages in a row were passed', () => {
  assert.equal(scorePlacement({}).suggestedLevel, 'beginner')
  assert.equal(scorePlacement(marks(basics, basics.passMark - 1)).suggestedLevel, 'beginner')
  assert.equal(scorePlacement(marks(basics, basics.passMark)).suggestedLevel, 'low-intermediate')
  assert.equal(
    scorePlacement({ ...marks(basics, 5), ...marks(everyday, everyday.passMark - 1) }).suggestedLevel,
    'low-intermediate',
  )
  assert.equal(scorePlacement({ ...marks(basics, 5), ...marks(everyday, 5) }).suggestedLevel, 'higher')
})

test('a close call is decided by the tiebreakers', () => {
  // Clear results never need tiebreakers.
  assert.equal(scoreStage(basics, marks(basics, 2)).borderline, false)
  assert.equal(scoreStage(basics, marks(basics, 5)).borderline, false)
  assert.equal(scoreStage(basics, marks(basics, 3)).borderline, true)
  assert.equal(scoreStage(basics, marks(basics, 4)).borderline, true)

  // 3/5 then 3/3 reaches 6/8 and passes; 4/5 then 1/3 is 5/8 and fails.
  assert.equal(scorePlacement({ ...marks(basics, 3), ...tiebreaks(basics, 3) }).suggestedLevel, 'low-intermediate')
  assert.equal(scorePlacement({ ...marks(basics, 4), ...tiebreaks(basics, 1) }).suggestedLevel, 'beginner')
  assert.equal(scoreStage(basics, { ...marks(basics, 4), ...tiebreaks(basics, 2) }).tiebreakCorrect, 2)

  // Same rule in stage 2.
  assert.equal(
    scorePlacement({ ...marks(basics, 5), ...marks(everyday, 4), ...tiebreaks(everyday, 2) }).suggestedLevel,
    'higher',
  )
})

test('tiebreakers are ignored unless the core score is a close call', () => {
  const clearFail = scoreStage(basics, { ...marks(basics, 1), ...tiebreaks(basics, 3) })
  assert.equal(clearFail.tiebreakCorrect, null)
  assert.equal(clearFail.passed, false)
  const clearPass = scoreStage(basics, { ...marks(basics, 5), ...tiebreaks(basics, 0) })
  assert.equal(clearPass.tiebreakCorrect, null)
  assert.equal(clearPass.passed, true)
})

test('ending the test before any tiebreaker falls back to the core pass mark', () => {
  assert.equal(scoreStage(basics, marks(basics, 4)).passed, true)
  assert.equal(scoreStage(basics, marks(basics, 3)).passed, false)
  // Once one tiebreaker is marked, the others count as not passed.
  assert.equal(scoreStage(basics, { ...marks(basics, 4), [basics.tiebreakers[0].id]: true }).passed, false)
})

test('stage 2 answers do not count when stage 1 was not passed', () => {
  const score = scorePlacement({ ...marks(basics, 1), ...marks(everyday, 5) })
  assert.equal(score.suggestedLevel, 'beginner')
  assert.deepEqual(score.stages.map(stage => stage.stageId), ['basics'])
})

test('parsing drops unknown items and rejects bad input', () => {
  const parsed = parsePlacementInput({
    studentId: 'maria', answers: { 'b1-name': true, 'bt1-to-be-question': false, bogus: true }, note: '  shy  ', readsCards: false,
  })
  assert.deepEqual(parsed, {
    studentId: 'maria', answers: { 'b1-name': true, 'bt1-to-be-question': false }, level: null, note: 'shy', readsCards: false,
  })
  assert.equal(parsePlacementInput({ studentId: 'maria', answers: { 'b1-name': true } }).readsCards, null)
  assert.throws(() => parsePlacementInput({ studentId: 'maria', answers: { 'b1-name': true }, readsCards: 'no' }), InvalidPlacementError)
  assert.equal(parsePlacementInput({ studentId: 'maria', answers: { 'b1-name': true }, level: 'higher' }).level, 'higher')
  assert.throws(() => parsePlacementInput({ answers: { 'b1-name': true } }), InvalidPlacementError)
  assert.throws(() => parsePlacementInput({ studentId: 'maria', answers: {} }), InvalidPlacementError)
  assert.throws(() => parsePlacementInput({ studentId: 'maria', answers: { 'b1-name': 'yes' } }), InvalidPlacementError)
  assert.throws(() => parsePlacementInput({ studentId: 'maria', answers: { 'b1-name': true }, level: 'expert' }), InvalidPlacementError)
})

test('saving scores on the server, keeps the override, and the latest placement wins', async () => {
  await withFixture(async db => {
    assert.equal(await getLatestEslPlacement(db, 'maria'), null)

    const first = await saveEslPlacement(db, 'sarah', '2026-11-05', {
      studentId: 'maria', answers: marks(basics, 2), level: null, note: '', readsCards: false,
    }, 1)
    assert.equal((await getLatestEslPlacement(db, 'maria'))?.readsCards, false)
    assert.equal(first?.level, 'beginner')

    await saveEslPlacement(db, 'sarah', '2026-11-12', {
      studentId: 'maria',
      answers: { ...marks(basics, 5), ...marks(everyday, 3), ...tiebreaks(everyday, 2) },
      level: 'higher',
      note: 'Speaks well',
      readsCards: true,
    }, 2)
    const latest = await getLatestEslPlacement(db, 'maria')
    assert.equal(latest?.date, '2026-11-12')
    assert.equal(latest?.suggestedLevel, 'low-intermediate')
    assert.equal(latest?.level, 'higher')
    assert.equal(latest?.basicsScore, 5)
    assert.equal(latest?.everydayScore, 3)
    assert.equal(latest?.stages[1].tiebreakCorrect, 2)
    assert.equal(latest?.readsCards, true)
    assert.equal(latest?.tutorName, 'Sarah')
    assert.equal(latest?.note, 'Speaks well')
  })
})

test('a beginner placement stores no stage 2 score, and non-students are refused', async () => {
  await withFixture(async db => {
    await saveEslPlacement(db, 'sarah', '2026-11-05', { studentId: 'maria', answers: marks(basics, 0), level: null, note: '', readsCards: null })
    assert.equal((await getLatestEslPlacement(db, 'maria'))?.everydayScore, null)

    const refused = await saveEslPlacement(db, 'sarah', '2026-11-05', { studentId: 'sarah', answers: marks(basics, 5), level: null, note: '', readsCards: null })
    assert.equal(refused, null)
  })
})
