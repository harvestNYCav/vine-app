import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SKILLS } from '@/lib/math'

const VALID_SKILL_TAGS = new Set(SKILLS.map(s => s.tag))
const MAX_PROBLEMS = 100_000

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT * FROM math_progress WHERE user_id = ?', args: [session.userId] })
  const row = result.rows[0]

  if (!row) {
    return NextResponse.json({
      skill_mastery: {},
      current_skill: null,
      diagnostic_done: false,
      total_problems: 0,
      total_correct: 0,
      mistake_profile: { carry_error: 0, borrow_error: 0, arithmetic_fact_error: 0, sign_error: 0 },
      skill_attempt_counts: {},
    })
  }

  return NextResponse.json({
    skill_mastery: JSON.parse(row.skill_mastery as string),
    current_skill: row.current_skill as string | null,
    diagnostic_done: Number(row.diagnostic_done) === 1,
    total_problems: Number(row.total_problems),
    total_correct: Number(row.total_correct),
    mistake_profile: JSON.parse(row.mistake_profile as string),
    skill_attempt_counts: JSON.parse(row.skill_attempt_counts as string),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const totalProblems = Number(body.total_problems) || 0
  const totalCorrect = Number(body.total_correct) || 0
  if (totalProblems < 0 || totalCorrect < 0) {
    return NextResponse.json({ error: 'Invalid totals' }, { status: 400 })
  }
  if (totalCorrect > totalProblems) {
    return NextResponse.json({ error: 'total_correct cannot exceed total_problems' }, { status: 400 })
  }
  if (totalProblems > MAX_PROBLEMS) {
    return NextResponse.json({ error: 'total_problems out of range' }, { status: 400 })
  }

  const rawMastery = body.skill_mastery && typeof body.skill_mastery === 'object' ? body.skill_mastery : {}
  const skillMastery: Record<string, number> = {}
  for (const tag of VALID_SKILL_TAGS) {
    if (tag in rawMastery) {
      skillMastery[tag] = Math.min(1, Math.max(0, Number(rawMastery[tag]) || 0))
    }
  }

  const rawCounts = body.skill_attempt_counts && typeof body.skill_attempt_counts === 'object' ? body.skill_attempt_counts : {}
  const skillAttemptCounts: Record<string, number> = {}
  for (const tag of VALID_SKILL_TAGS) {
    if (tag in rawCounts) {
      skillAttemptCounts[tag] = Math.min(MAX_PROBLEMS, Math.max(0, Math.floor(Number(rawCounts[tag]) || 0)))
    }
  }

  const VALID_MISTAKE_KEYS = new Set(['carry_error', 'borrow_error', 'arithmetic_fact_error', 'sign_error'])
  const rawProfile = body.mistake_profile && typeof body.mistake_profile === 'object' ? body.mistake_profile : {}
  const mistakeProfile: Record<string, number> = {}
  for (const key of VALID_MISTAKE_KEYS) {
    mistakeProfile[key] = Math.max(0, Number(rawProfile[key]) || 0)
  }

  const currentSkill = typeof body.current_skill === 'string' && VALID_SKILL_TAGS.has(body.current_skill)
    ? body.current_skill
    : null

  const db = await getDb()
  await db.execute({
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
      JSON.stringify(skillMastery),
      currentSkill,
      body.diagnostic_done ? 1 : 0,
      totalProblems,
      totalCorrect,
      JSON.stringify(mistakeProfile),
      JSON.stringify(skillAttemptCounts),
      Date.now(),
    ],
  })

  return NextResponse.json({ ok: true })
}
