import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  getRegentsExamById,
  getRegentsSection,
  getRegentsSectionQuestions,
  isRegentsCourse,
} from '@/content/regents'
import type { PublicRegentsQuestion, RegentsChoice, RegentsCourse, RegentsQuestion } from '@/content/regents/types'
import { getSession } from '@/lib/auth'
import { localDateKey } from '@/lib/dates'
import getDb from '@/lib/db'
import { getStudentRegentsCourses } from '@/lib/regents-courses'
import { studentCanAccessRegentsExam } from '@/lib/regents-exam-access'
import { WEEKEND_DRAFT_TTL_MS } from '@/lib/resumable-work'
import { getStudentTracks } from '@/lib/tracks'

type SavedResponse = { questionId: string; answer: RegentsChoice }

function tables(course: RegentsCourse) {
  return course === 'english'
    ? { attempts: 'ela_exam_attempts', progress: 'ela_exam_section_progress', math: false }
    : { attempts: 'math_exam_attempts', progress: 'math_exam_section_progress', math: true }
}

function isChoice(value: unknown): value is RegentsChoice {
  return value === '1' || value === '2' || value === '3' || value === '4'
}

function parseQuestionIds(value: unknown): string[] | null {
  if (typeof value !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(id => typeof id === 'string')
      && new Set(parsed).size === parsed.length ? parsed : null
  } catch {
    return null
  }
}

function parseResponses(value: unknown): SavedResponse[] | null {
  if (typeof value !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const responses: SavedResponse[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') return null
      const response = item as Record<string, unknown>
      if (typeof response.questionId !== 'string' || !isChoice(response.answer)) return null
      responses.push({ questionId: response.questionId, answer: response.answer })
    }
    return new Set(responses.map(response => response.questionId)).size === responses.length ? responses : null
  } catch {
    return null
  }
}

function publicQuestion(question: RegentsQuestion): PublicRegentsQuestion {
  return {
    id: question.id,
    number: question.number,
    sectionSlug: question.sectionSlug,
    sourcePage: question.sourcePage,
    prompt: question.prompt,
    choices: question.choices,
    image: question.image,
  }
}

function completedResult(attemptId: string, row: Record<string, unknown>) {
  const pointsEarned = Number(row.points_earned ?? 0)
  const pointsPossible = Number(row.points_possible ?? 0)
  return {
    attemptId,
    pointsEarned,
    pointsPossible,
    percentage: pointsPossible ? Math.round(pointsEarned / pointsPossible * 100) : 0,
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid request')
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (typeof body.course !== 'string' || !isRegentsCourse(body.course)) {
    return NextResponse.json({ error: 'Invalid course' }, { status: 400 })
  }
  const course = body.course
  const selectedTables = tables(course)
  const db = await getDb()
  const [tracks, assignedCourses] = await Promise.all([
    getStudentTracks(db, session.userId),
    getStudentRegentsCourses(db, session.userId),
  ])

  if (body.action === 'start') {
    const exam = typeof body.examId === 'string' ? getRegentsExamById(body.examId) : null
    const section = exam && typeof body.sectionSlug === 'string' ? getRegentsSection(exam, body.sectionSlug) : null
    if (!exam || exam.course !== course || !section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    if (!studentCanAccessRegentsExam(tracks, assignedCourses, exam)) {
      return NextResponse.json({ error: 'Exam not assigned' }, { status: 403 })
    }
    const questions = getRegentsSectionQuestions(exam, section)
    if (!questions.length) return NextResponse.json({ error: 'This section is still under review' }, { status: 409 })
    const byId = new Map(questions.map(question => [question.id, question]))
    const now = Date.now()
    await db.execute({
      sql: `DELETE FROM ${selectedTables.attempts} WHERE user_id = ? AND finished_at IS NULL AND expires_at <= ?`,
      args: [session.userId, now],
    })
    const activeResult = await db.execute({
      sql: `SELECT id, started_at, question_ids, responses FROM ${selectedTables.attempts}
        WHERE user_id = ? AND exam_id = ? AND section_slug = ? AND finished_at IS NULL AND expires_at > ?
        ORDER BY started_at DESC LIMIT 1`,
      args: [session.userId, exam.id, section.slug, now],
    })
    const active = activeResult.rows[0]
    const activeIds = active ? parseQuestionIds(active.question_ids) : null
    const activeResponses = active ? parseResponses(active.responses) : null
    if (active && activeIds && activeResponses && activeIds.every(id => byId.has(id))
      && activeResponses.every(response => activeIds.includes(response.questionId))) {
      return NextResponse.json({
        attemptId: String(active.id),
        startedAt: Number(active.started_at),
        questions: activeIds.map(id => publicQuestion(byId.get(id)!)),
        responses: activeResponses,
      })
    }

    const attemptId = randomUUID()
    const ids = questions.map(question => question.id)
    if (selectedTables.math) {
      await db.execute({
        sql: `INSERT INTO ${selectedTables.attempts}
          (id, user_id, exam_id, section_slug, language, started_at, expires_at, question_ids)
          VALUES (?, ?, ?, ?, 'en', ?, ?, ?)`,
        args: [attemptId, session.userId, exam.id, section.slug, now, now + WEEKEND_DRAFT_TTL_MS, JSON.stringify(ids)],
      })
    } else {
      await db.execute({
        sql: `INSERT INTO ${selectedTables.attempts}
          (id, user_id, exam_id, section_slug, started_at, expires_at, question_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [attemptId, session.userId, exam.id, section.slug, now, now + WEEKEND_DRAFT_TTL_MS, JSON.stringify(ids)],
      })
    }
    return NextResponse.json({
      attemptId,
      startedAt: now,
      questions: questions.map(publicQuestion),
      responses: [],
    })
  }

  if (body.action !== 'check' && body.action !== 'finish') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
  if (!attemptId) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })
  const result = await db.execute({
    sql: `SELECT * FROM ${selectedTables.attempts} WHERE id = ? AND user_id = ?`,
    args: [attemptId, session.userId],
  })
  const attempt = result.rows[0]
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  const exam = getRegentsExamById(String(attempt.exam_id))
  const section = exam ? getRegentsSection(exam, String(attempt.section_slug)) : null
  if (!exam || exam.course !== course || !section) return NextResponse.json({ error: 'Exam content is missing' }, { status: 500 })
  if (!studentCanAccessRegentsExam(tracks, assignedCourses, exam)) {
    return NextResponse.json({ error: 'Exam not assigned' }, { status: 403 })
  }
  if (attempt.finished_at) {
    return body.action === 'finish'
      ? NextResponse.json(completedResult(attemptId, attempt as Record<string, unknown>))
      : NextResponse.json({ error: 'Attempt already finished' }, { status: 409 })
  }
  if (Number(attempt.expires_at) <= Date.now()) return NextResponse.json({ error: 'Attempt expired' }, { status: 410 })

  const questionIds = parseQuestionIds(attempt.question_ids)
  const responses = parseResponses(attempt.responses)
  if (!questionIds || !responses) return NextResponse.json({ error: 'Attempt data is invalid' }, { status: 500 })
  const readyQuestions = getRegentsSectionQuestions(exam, section)
  const byId = new Map(readyQuestions.map(question => [question.id, question]))
  if (questionIds.some(id => !byId.has(id))) return NextResponse.json({ error: 'Attempt content is unavailable' }, { status: 409 })

  if (body.action === 'check') {
    const questionId = typeof body.questionId === 'string' ? body.questionId : ''
    const answer = body.answer
    if (!questionIds.includes(questionId) || !isChoice(answer)) {
      return NextResponse.json({ error: 'Invalid answer' }, { status: 400 })
    }
    const question = byId.get(questionId)!
    let persistedAnswer: RegentsChoice | null = null
    let serialized = String(attempt.responses)
    for (let retry = 0; retry < 4; retry++) {
      const stored = parseResponses(serialized)
      if (!stored) return NextResponse.json({ error: 'Attempt data is invalid' }, { status: 500 })
      const existing = stored.find(response => response.questionId === questionId)
      if (existing) {
        persistedAnswer = existing.answer
        break
      }
      const next = JSON.stringify([...stored, { questionId, answer }])
      const saved = await db.execute({
        sql: `UPDATE ${selectedTables.attempts} SET responses = ?
          WHERE id = ? AND user_id = ? AND finished_at IS NULL AND responses = ?`,
        args: [next, attemptId, session.userId, serialized],
      })
      if (saved.rowsAffected === 1) {
        persistedAnswer = answer
        break
      }
      const latest = await db.execute({
        sql: `SELECT responses, finished_at, expires_at FROM ${selectedTables.attempts} WHERE id = ? AND user_id = ?`,
        args: [attemptId, session.userId],
      })
      const row = latest.rows[0]
      if (!row) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      if (row.finished_at) return NextResponse.json({ error: 'Attempt already finished' }, { status: 409 })
      if (Number(row.expires_at) <= Date.now()) return NextResponse.json({ error: 'Attempt expired' }, { status: 410 })
      serialized = String(row.responses)
    }
    if (!persistedAnswer) return NextResponse.json({ error: 'Could not save answer' }, { status: 409 })
    return NextResponse.json({
      correct: persistedAnswer === question.correct,
      answer: persistedAnswer,
      correctAnswer: question.correct,
      explanation: question.explanation,
      explanationSource: question.explanationSource,
    })
  }

  if (responses.length !== questionIds.length) {
    return NextResponse.json({ error: 'Complete every question first' }, { status: 400 })
  }
  const responseById = new Map(responses.map(response => [response.questionId, response.answer]))
  if (questionIds.some(id => !responseById.has(id))) {
    return NextResponse.json({ error: 'Complete every question first' }, { status: 400 })
  }
  const pointsEarned = questionIds.reduce((count, id) => count + (responseById.get(id) === byId.get(id)!.correct ? 1 : 0), 0)
  const pointsPossible = questionIds.length
  const endedAt = Date.now()
  let completedElsewhere = false
  const transaction = await db.transaction('write')
  try {
    const completion = await transaction.execute({
      sql: `UPDATE ${selectedTables.attempts} SET finished_at = ?, points_earned = ?, points_possible = ?
        WHERE id = ? AND user_id = ? AND finished_at IS NULL`,
      args: [endedAt, pointsEarned, pointsPossible, attemptId, session.userId],
    })
    if (completion.rowsAffected !== 1) {
      completedElsewhere = true
    } else {
      await transaction.batch([
        {
          sql: `INSERT INTO ${selectedTables.progress}
            (user_id, exam_id, section_slug, attempts, best_points, best_possible,
             latest_points, latest_possible, completed_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, exam_id, section_slug) DO UPDATE SET
              attempts = ${selectedTables.progress}.attempts + 1,
              best_points = CASE WHEN ${selectedTables.progress}.best_possible = 0
                OR excluded.best_points * ${selectedTables.progress}.best_possible > ${selectedTables.progress}.best_points * excluded.best_possible
                THEN excluded.best_points ELSE ${selectedTables.progress}.best_points END,
              best_possible = CASE WHEN ${selectedTables.progress}.best_possible = 0
                OR excluded.best_points * ${selectedTables.progress}.best_possible > ${selectedTables.progress}.best_points * excluded.best_possible
                THEN excluded.best_possible ELSE ${selectedTables.progress}.best_possible END,
              latest_points = excluded.latest_points,
              latest_possible = excluded.latest_possible,
              completed_at = COALESCE(${selectedTables.progress}.completed_at, excluded.completed_at),
              updated_at = excluded.updated_at`,
          args: [session.userId, exam.id, section.slug, pointsEarned, pointsPossible, pointsEarned, pointsPossible, endedAt, endedAt],
        },
        {
          sql: `INSERT INTO activity_log (user_id, date, activity_type, count)
            VALUES (?, ?, 'practice', 1)
            ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1`,
          args: [session.userId, localDateKey(endedAt)],
        },
      ])
      await transaction.commit()
    }
  } finally {
    transaction.close()
  }
  if (completedElsewhere) {
    const latest = await db.execute({
      sql: `SELECT * FROM ${selectedTables.attempts} WHERE id = ? AND user_id = ?`,
      args: [attemptId, session.userId],
    })
    return latest.rows[0]?.finished_at
      ? NextResponse.json(completedResult(attemptId, latest.rows[0] as Record<string, unknown>))
      : NextResponse.json({ error: 'Could not finish attempt' }, { status: 409 })
  }
  return NextResponse.json({
    attemptId,
    pointsEarned,
    pointsPossible,
    percentage: Math.round(pointsEarned / pointsPossible * 100),
  })
}
