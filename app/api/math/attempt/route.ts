import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { localDateKey } from '@/lib/dates'
import {
  classifyMistake,
  generateProblem,
  getNextSkill,
  getSkillByTag,
  MASTERY_THRESHOLD,
  MIN_ATTEMPTS,
  selectNextProblem,
  SKILLS,
  updateMastery,
  type MathProblem,
  type MistakeType,
} from '@/lib/math'

const VALID_SESSION_TYPES = new Set(['diagnostic', 'practice_5', 'practice_10', 'flat_10', 'flat_25', 'custom'])
const VALID_SKILL_TAGS = new Set(SKILLS.map(skill => skill.tag))
const MAX_CUSTOM_QUESTIONS = 50
const MAX_TIMED_PROBLEMS: Record<string, number> = {
  practice_5: 200,
  practice_10: 400,
}
const DIAGNOSTIC_TIER_TOTAL = 3
const ATTEMPT_TTL_MS = 30 * 60 * 1000

type SessionType = 'diagnostic' | 'practice_5' | 'practice_10' | 'flat_10' | 'flat_25' | 'custom'

type StoredProblem = MathProblem

type SubmittedAnswer = {
  problemId: string
  answer: unknown
}

function sanitizeMastery(value: unknown): Record<string, number> {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const mastery: Record<string, number> = {}
  for (const tag of VALID_SKILL_TAGS) {
    if (tag in raw) mastery[tag] = Math.min(1, Math.max(0, Number(raw[tag]) || 0))
  }
  return mastery
}

function sanitizeCounts(value: unknown): Record<string, number> {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const counts: Record<string, number> = {}
  for (const tag of VALID_SKILL_TAGS) {
    if (tag in raw) counts[tag] = Math.max(0, Math.floor(Number(raw[tag]) || 0))
  }
  return counts
}

function selectedSkillTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((tag): tag is string => typeof tag === 'string' && VALID_SKILL_TAGS.has(tag)))]
}

function countFor(type: SessionType, customCount: unknown): number {
  if (type === 'diagnostic') return SKILLS.length * DIAGNOSTIC_TIER_TOTAL
  if (type === 'flat_10') return 10
  if (type === 'flat_25') return 25
  if (type === 'practice_5') return MAX_TIMED_PROBLEMS.practice_5
  if (type === 'practice_10') return MAX_TIMED_PROBLEMS.practice_10
  return Math.min(MAX_CUSTOM_QUESTIONS, Math.max(1, Math.floor(Number(customCount) || 10)))
}

function makeProblems(body: Record<string, unknown>, type: SessionType): StoredProblem[] {
  if (type === 'diagnostic') {
    return SKILLS.flatMap(skill =>
      Array.from({ length: DIAGNOSTIC_TIER_TOTAL }, () => generateProblem(skill))
    )
  }

  const count = countFor(type, body.customCount)
  const mastery = sanitizeMastery(body.skillMastery)
  const counts = sanitizeCounts(body.skillAttemptCounts)
  const selectedTags = selectedSkillTags(body.selectedSkills)
  const pinnedTags = type === 'custom' && selectedTags.length > 0 ? selectedTags : null
  let currentSkill = typeof body.currentSkill === 'string' && VALID_SKILL_TAGS.has(body.currentSkill)
    ? body.currentSkill
    : SKILLS[0].tag

  if (type !== 'custom') {
    const currentCount = counts[currentSkill] || 0
    if ((mastery[currentSkill] ?? 0) >= MASTERY_THRESHOLD && currentCount >= MIN_ATTEMPTS) {
      currentSkill = getNextSkill(currentSkill)?.tag ?? currentSkill
    }
  }

  const recentOperands: string[] = []
  return Array.from({ length: count }, () => {
    const problem = selectNextProblem(currentSkill, mastery, [], recentOperands, pinnedTags)
    recentOperands.push(`${problem.operands[0]},${problem.operands[1]}`)
    if (recentOperands.length > 20) recentOperands.shift()
    return problem
  })
}

function publicProblem(problem: StoredProblem): MathProblem {
  return problem
}

function loadStoredProblems(value: unknown): StoredProblem[] {
  if (typeof value !== 'string') return []
  const parsed = JSON.parse(value)
  return Array.isArray(parsed) ? parsed as StoredProblem[] : []
}

async function loadProgress(userId: string) {
  const db = await getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM math_progress WHERE user_id = ?',
    args: [userId],
  })
  const row = result.rows[0]
  return row ? {
    skillMastery: sanitizeMastery(JSON.parse(String(row.skill_mastery))),
    currentSkill: typeof row.current_skill === 'string' && VALID_SKILL_TAGS.has(row.current_skill) ? row.current_skill : null,
    diagnosticDone: Number(row.diagnostic_done) === 1,
    totalProblems: Number(row.total_problems) || 0,
    totalCorrect: Number(row.total_correct) || 0,
    mistakeProfile: JSON.parse(String(row.mistake_profile)) as Record<MistakeType, number>,
    skillAttemptCounts: sanitizeCounts(JSON.parse(String(row.skill_attempt_counts))),
  } : {
    skillMastery: {} as Record<string, number>,
    currentSkill: null as string | null,
    diagnosticDone: false,
    totalProblems: 0,
    totalCorrect: 0,
    mistakeProfile: { carry_error: 0, borrow_error: 0, arithmetic_fact_error: 0, sign_error: 0 } as Record<MistakeType, number>,
    skillAttemptCounts: {} as Record<string, number>,
  }
}

function nextDiagnosticSkill(problems: StoredProblem[], answers: SubmittedAnswer[]): string {
  const byId = new Map(problems.map(problem => [problem.id, problem]))
  const bySkill = new Map<string, boolean[]>()
  for (const answer of answers) {
    const problem = byId.get(answer.problemId)
    if (!problem) continue
    if (!bySkill.has(problem.skill_tag)) bySkill.set(problem.skill_tag, [])
    bySkill.get(problem.skill_tag)!.push(Number(answer.answer) === problem.answer)
  }

  let lastPassed = SKILLS[0].tag
  for (const skill of SKILLS) {
    const results = bySkill.get(skill.tag) ?? []
    if (results.length === 0) break
    const correct = results.filter(Boolean).length
    if (correct / results.length >= 0.8) {
      lastPassed = skill.tag
    } else {
      break
    }
  }
  return lastPassed
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (action === 'start') {
    const type = body.sessionType
    if (typeof type !== 'string' || !VALID_SESSION_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid sessionType' }, { status: 400 })
    }

    const problems = makeProblems(body, type as SessionType)
    const now = Date.now()
    const id = randomUUID()
    const db = await getDb()
    await db.execute({
      sql: `
        INSERT INTO math_attempts (id, user_id, session_type, started_at, expires_at, problems)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, session.userId, type, now, now + ATTEMPT_TTL_MS, JSON.stringify(problems)],
    })

    return NextResponse.json({
      attemptId: id,
      sessionType: type,
      startedAt: now,
      problems: problems.map(publicProblem),
    })
  }

  if (action !== 'finish') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
  const answers = Array.isArray(body.answers) ? body.answers as SubmittedAnswer[] : []
  if (!attemptId || answers.length === 0) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })
  }

  const db = await getDb()
  const attemptResult = await db.execute({
    sql: 'SELECT * FROM math_attempts WHERE id = ? AND user_id = ?',
    args: [attemptId, session.userId],
  })
  const attempt = attemptResult.rows[0]
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.finished_at) return NextResponse.json({ error: 'Attempt already finished' }, { status: 409 })
  if (Number(attempt.expires_at) < Date.now()) return NextResponse.json({ error: 'Attempt expired' }, { status: 410 })

  const problems = loadStoredProblems(attempt.problems)
  const problemById = new Map(problems.map(problem => [problem.id, problem]))
  const uniqueAnswers = answers.filter((answer, index, arr) =>
    typeof answer.problemId === 'string' &&
    arr.findIndex(item => item.problemId === answer.problemId) === index &&
    problemById.has(answer.problemId)
  )
  if (uniqueAnswers.length === 0) {
    return NextResponse.json({ error: 'No valid answers' }, { status: 400 })
  }
  const sessionType = String(attempt.session_type) as SessionType
  if (
    (sessionType === 'flat_10' && uniqueAnswers.length !== 10) ||
    (sessionType === 'flat_25' && uniqueAnswers.length !== 25) ||
    (sessionType === 'custom' && uniqueAnswers.length !== problems.length)
  ) {
    return NextResponse.json({ error: 'Attempt is incomplete' }, { status: 400 })
  }

  const progress = await loadProgress(session.userId)
  let sessionCorrect = 0
  for (const answer of uniqueAnswers) {
    const problem = problemById.get(answer.problemId)!
    const userAnswer = Number(answer.answer)
    const isCorrect = Number.isFinite(userAnswer) && userAnswer === problem.answer
    if (isCorrect) sessionCorrect++

    progress.totalProblems++
    if (isCorrect) progress.totalCorrect++
    progress.skillMastery = updateMastery(progress.skillMastery, problem.skill_tag, isCorrect)
    progress.skillAttemptCounts[problem.skill_tag] = (progress.skillAttemptCounts[problem.skill_tag] || 0) + 1
    if (!isCorrect && Number.isFinite(userAnswer)) {
      const mistakeType = classifyMistake(problem, userAnswer)
      progress.mistakeProfile[mistakeType] = (progress.mistakeProfile[mistakeType] || 0) + 1
    }
  }

  if (sessionType === 'diagnostic') {
    progress.diagnosticDone = true
    progress.currentSkill = nextDiagnosticSkill(problems, uniqueAnswers)
    if (!progress.skillMastery[progress.currentSkill]) progress.skillMastery[progress.currentSkill] = 0.3
  } else if (!progress.currentSkill) {
    progress.currentSkill = uniqueAnswers[uniqueAnswers.length - 1]
      ? problemById.get(uniqueAnswers[uniqueAnswers.length - 1].problemId)?.skill_tag ?? SKILLS[0].tag
      : SKILLS[0].tag
  }

  const endedAt = Date.now()
  const accuracy = Math.round(sessionCorrect / uniqueAnswers.length * 100)
  const currentSkill = progress.currentSkill ?? ''

  await db.batch([
    {
      sql: 'UPDATE math_attempts SET finished_at = ? WHERE id = ?',
      args: [endedAt, attemptId],
    },
    {
      sql: `
        INSERT INTO math_progress (user_id, skill_mastery, current_skill, diagnostic_done, total_problems, total_correct, mistake_profile, skill_attempt_counts, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          skill_mastery = excluded.skill_mastery,
          current_skill = excluded.current_skill,
          diagnostic_done = excluded.diagnostic_done,
          total_problems = excluded.total_problems,
          total_correct = excluded.total_correct,
          mistake_profile = excluded.mistake_profile,
          skill_attempt_counts = excluded.skill_attempt_counts,
          updated_at = excluded.updated_at
      `,
      args: [
        session.userId,
        JSON.stringify(progress.skillMastery),
        currentSkill || null,
        progress.diagnosticDone ? 1 : 0,
        progress.totalProblems,
        progress.totalCorrect,
        JSON.stringify(progress.mistakeProfile),
        JSON.stringify(progress.skillAttemptCounts),
        endedAt,
      ],
    },
    {
      sql: `
        INSERT INTO math_sessions (id, user_id, session_type, started_at, ended_at, total_problems, correct, accuracy, current_skill)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        attemptId,
        session.userId,
        sessionType,
        Number(attempt.started_at),
        endedAt,
        uniqueAnswers.length,
        sessionCorrect,
        accuracy,
        currentSkill,
      ],
    },
    ...(uniqueAnswers.length > 0 ? [{
      sql: `
        INSERT INTO activity_log (user_id, date, activity_type, count)
        VALUES (?, ?, 'practice', 1)
        ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
      `,
      args: [session.userId, localDateKey(endedAt)],
    }] : []),
  ], 'write')

  return NextResponse.json({
    record: {
      id: attemptId,
      session_type: sessionType,
      started_at: Number(attempt.started_at),
      ended_at: endedAt,
      total_problems: uniqueAnswers.length,
      correct: sessionCorrect,
      accuracy,
      current_skill: currentSkill,
    },
    progress: {
      skill_mastery: progress.skillMastery,
      current_skill: progress.currentSkill,
      diagnostic_done: progress.diagnosticDone,
      total_problems: progress.totalProblems,
      total_correct: progress.totalCorrect,
      mistake_profile: progress.mistakeProfile,
      skill_attempt_counts: progress.skillAttemptCounts,
    },
  })
}
