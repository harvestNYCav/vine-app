// Scoring for the ESL placement test, kept free of server imports so the tutor's test page can
// preview the result before saving. The server re-scores whatever it saves.
import { ESL_LEVELS, ESL_PLACEMENT_STAGES, type EslLevelId, type EslPlacementStage } from '@/content/esl-placement'

// Item id → whether the student passed it. Items the tutor didn't mark are missing.
export type PlacementAnswers = Record<string, boolean>

export interface StageScore {
  stageId: string
  coreCorrect: number
  coreTotal: number
  // The core score is a close call, so the stage needs its tiebreakers.
  borderline: boolean
  // Null unless the tiebreakers were counted (borderline and at least one of them marked).
  tiebreakCorrect: number | null
  tiebreakTotal: number
  passed: boolean
}

export interface PlacementScore {
  // Only the stages the student reached. Stage 2 is dropped when stage 1 wasn't passed.
  stages: StageScore[]
  suggestedLevel: EslLevelId
}

function countPassed(items: EslPlacementStage['items'], answers: PlacementAnswers): number {
  return items.filter(item => answers[item.id] === true).length
}

// A core score one below the pass mark or exactly on it is too close to call from 5 questions.
// A perfect core score is never borderline.
export function isBorderline(stage: EslPlacementStage, coreCorrect: number): boolean {
  return coreCorrect >= stage.passMark - 1 && coreCorrect <= stage.passMark && coreCorrect < stage.items.length
}

export function scoreStage(stage: EslPlacementStage, answers: PlacementAnswers): StageScore {
  const coreCorrect = countPassed(stage.items, answers)
  const borderline = isBorderline(stage, coreCorrect)
  const tiebreakAsked = stage.tiebreakers.some(item => item.id in answers)
  // Tiebreakers count only for a close call. If the tutor ended the test before asking any, the
  // core pass mark decides.
  const tiebreakCorrect = borderline && tiebreakAsked ? countPassed(stage.tiebreakers, answers) : null
  const passed = tiebreakCorrect === null
    ? coreCorrect >= stage.passMark
    : coreCorrect + tiebreakCorrect >= stage.tiebreakPassMark
  return {
    stageId: stage.id,
    coreCorrect,
    coreTotal: stage.items.length,
    borderline,
    tiebreakCorrect,
    tiebreakTotal: stage.tiebreakers.length,
    passed,
  }
}

// Scores the test. Unmarked items count as not passed, and the test stops at the first stage that
// isn't passed, so later answers can't lift the level.
export function scorePlacement(answers: PlacementAnswers): PlacementScore {
  const stages: StageScore[] = []
  for (const stage of ESL_PLACEMENT_STAGES) {
    const score = scoreStage(stage, answers)
    stages.push(score)
    if (!score.passed) break
  }
  const stagesPassed = stages.filter(stage => stage.passed).length
  return { stages, suggestedLevel: ESL_LEVELS[Math.min(stagesPassed, ESL_LEVELS.length - 1)].id }
}
