import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMathExamById } from '@/content/math-exams'
import type { MathExamLanguage, MathExamQuestionRecord } from '@/content/math-exams/types'
import { getSession } from '@/lib/auth'
import { localDateKey } from '@/lib/dates'
import getDb from '@/lib/db'
import {
  getMathExamQuestion,
  getMathExamSection,
  getMathExamSectionQuestions,
  localized,
  normalizeMathAnswer,
  toPublicMathExamQuestion,
} from '@/lib/math-exams'
import { getStudentTracks } from '@/lib/tracks'

const ATTEMPT_TTL_MS = 2 * 60 * 60 * 1000
const MAX_RESPONSE_LENGTH = 5000

type SubmittedResponse = {
  questionId: string
  answer: string
  selfScore?: number
}

function completedAttemptResult(attemptId: string, row: Record<string, unknown>) {
  const pointsEarned = Number(row.points_earned ?? 0)
  const pointsPossible = Number(row.points_possible ?? 0)
  return {
    attemptId,
    pointsEarned,
    pointsPossible,
    percentage: pointsPossible ? Math.round(pointsEarned / pointsPossible * 100) : 0,
    graded: [],
  }
}

function loadQuestionIds(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : []
  } catch {
    return []
  }
}

function validLanguage(value: unknown): value is MathExamLanguage {
  return value === 'en' || value === 'es'
}

function gradeObjective(question: MathExamQuestionRecord, answer: string) {
  if (question.grading.mode === 'choice') {
    const correct = answer.trim().toUpperCase() === question.grading.correct
    return {
      points: correct ? question.points : 0,
      correct,
      correctAnswer: question.grading.correct,
    }
  }

  if (question.grading.mode === 'exact') {
    const normalized = normalizeMathAnswer(answer)
    const correct = question.grading.acceptedAnswers.some(candidate =>
      normalizeMathAnswer(candidate) === normalized
    )
    return {
      points: correct ? question.points : 0,
      correct,
      correctAnswer: question.grading.acceptedAnswers[0],
    }
  }

  return null
}

async function authorizedStudent() {
  const session = await getSession()
  if (!session || session.role !== 'student') return null
  const db = await getDb()
  const tracks = await getStudentTracks(db, session.userId)
  return tracks.includes('math') ? { session, db } : null
}

export async function POST(req: NextRequest) {
  const auth = await authorizedStudent()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const body = rawBody as Record<string, unknown>

  if (body.action === 'start') {
    const examId = typeof body.examId === 'string' ? body.examId : ''
    const sectionSlug = typeof body.sectionSlug === 'string' ? body.sectionSlug : ''
    const language = validLanguage(body.language) ? body.language : 'en'
    const match = getMathExamSection(examId, sectionSlug)
    if (!match) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

    const questions = getMathExamSectionQuestions(examId, sectionSlug)
    if (questions.length !== match.section.questionIds.length) {
      return NextResponse.json({ error: 'Section content is incomplete' }, { status: 500 })
    }

    const id = randomUUID()
    const now = Date.now()
    await auth.db.execute({
      sql: `
        INSERT INTO math_exam_attempts
          (id, user_id, exam_id, section_slug, language, started_at, expires_at, question_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        auth.session.userId,
        examId,
        sectionSlug,
        language,
        now,
        now + ATTEMPT_TTL_MS,
        JSON.stringify(questions.map(question => question.id)),
      ],
    })

    return NextResponse.json({
      attemptId: id,
      startedAt: now,
      questions: questions.map(toPublicMathExamQuestion),
    })
  }

  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
  if (!attemptId) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 })
  if (body.action !== 'check' && body.action !== 'finish') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const attemptResult = await auth.db.execute({
    sql: 'SELECT * FROM math_exam_attempts WHERE id = ? AND user_id = ?',
    args: [attemptId, auth.session.userId],
  })
  const attempt = attemptResult.rows[0]
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
  if (attempt.finished_at) {
    if (body.action === 'finish') {
      return NextResponse.json(completedAttemptResult(attemptId, attempt as Record<string, unknown>))
    }
    return NextResponse.json({ error: 'Attempt already finished' }, { status: 409 })
  }
  if (Number(attempt.expires_at) < Date.now()) {
    return NextResponse.json({ error: 'Attempt expired' }, { status: 410 })
  }

  const questionIds = loadQuestionIds(attempt.question_ids)
  if (!questionIds.length) {
    return NextResponse.json({ error: 'Attempt content is missing' }, { status: 500 })
  }
  const questionIdSet = new Set(questionIds)
  const language: MathExamLanguage = validLanguage(attempt.language) ? attempt.language : 'en'

  if (body.action === 'check') {
    const questionId = typeof body.questionId === 'string' ? body.questionId : ''
    const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
    if (!questionIdSet.has(questionId) || !answer || answer.length > MAX_RESPONSE_LENGTH) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
    }

    const question = getMathExamQuestion(questionId)
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    const objective = gradeObjective(question, answer)

    return NextResponse.json({
      correct: objective?.correct ?? null,
      awardedPoints: objective?.points ?? null,
      pointsPossible: question.points,
      correctAnswer: objective?.correctAnswer ?? null,
      explanation: localized(question.grading.explanation, language),
      criteria: question.grading.mode === 'self-assessed'
        ? question.grading.criteria.map(item => localized(item, language))
        : [],
      requiresSelfAssessment: question.grading.mode === 'self-assessed',
    })
  }

  const rawResponses = Array.isArray(body.responses) ? body.responses : []
  if (rawResponses.length !== questionIds.length) {
    return NextResponse.json({ error: 'Every question must be completed once' }, { status: 400 })
  }
  const responses: SubmittedResponse[] = rawResponses.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    if (
      typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' ||
      !value.answer.trim() ||
      value.answer.length > MAX_RESPONSE_LENGTH
    ) return []
    return [{
      questionId: value.questionId,
      answer: value.answer.trim(),
      selfScore: typeof value.selfScore === 'number' ? value.selfScore : undefined,
    }]
  })

  const responseById = new Map(responses.map(response => [response.questionId, response]))
  if (
    responses.length !== questionIds.length ||
    responseById.size !== responses.length ||
    questionIds.some(id => !responseById.has(id))
  ) {
    return NextResponse.json({ error: 'Every question must be completed once' }, { status: 400 })
  }
  const canonicalResponses = questionIds.map(id => responseById.get(id)!)

  let pointsEarned = 0
  let pointsPossible = 0
  const graded = []
  for (const questionId of questionIds) {
    const question = getMathExamQuestion(questionId)
    const response = responseById.get(questionId)!
    if (!question) return NextResponse.json({ error: 'Question content is missing' }, { status: 500 })
    pointsPossible += question.points

    const objective = gradeObjective(question, response.answer)
    let awardedPoints: number
    if (objective) {
      awardedPoints = objective.points
    } else {
      if (
        response.selfScore === undefined ||
        !Number.isInteger(response.selfScore) ||
        response.selfScore < 0 ||
        response.selfScore > question.points
      ) {
        return NextResponse.json({ error: `Question ${question.number} needs a self-score` }, { status: 400 })
      }
      awardedPoints = response.selfScore
    }

    pointsEarned += awardedPoints
    graded.push({
      questionId,
      awardedPoints,
      pointsPossible: question.points,
      correct: awardedPoints === question.points,
    })
  }

  const endedAt = Date.now()
  const examId = String(attempt.exam_id)
  const sectionSlug = String(attempt.section_slug)
  if (!getMathExamById(examId)) {
    return NextResponse.json({ error: 'Exam content is missing' }, { status: 500 })
  }

  let completedByAnotherRequest = false
  const transaction = await auth.db.transaction('write')
  try {
    const completion = await transaction.execute({
      sql: `
        UPDATE math_exam_attempts
        SET finished_at = ?, responses = ?, points_earned = ?, points_possible = ?
        WHERE id = ? AND user_id = ? AND finished_at IS NULL
      `,
      args: [
        endedAt,
        JSON.stringify(canonicalResponses),
        pointsEarned,
        pointsPossible,
        attemptId,
        auth.session.userId,
      ],
    })

    if (completion.rowsAffected !== 1) {
      completedByAnotherRequest = true
    } else {
      await transaction.batch([
        {
          sql: `
            INSERT INTO math_exam_section_progress
              (user_id, exam_id, section_slug, attempts, best_points, best_possible,
               latest_points, latest_possible, completed_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, exam_id, section_slug) DO UPDATE SET
              attempts = math_exam_section_progress.attempts + 1,
              best_points = MAX(math_exam_section_progress.best_points, excluded.best_points),
              best_possible = excluded.best_possible,
              latest_points = excluded.latest_points,
              latest_possible = excluded.latest_possible,
              completed_at = COALESCE(math_exam_section_progress.completed_at, excluded.completed_at),
              updated_at = excluded.updated_at
          `,
          args: [
            auth.session.userId,
            examId,
            sectionSlug,
            pointsEarned,
            pointsPossible,
            pointsEarned,
            pointsPossible,
            endedAt,
            endedAt,
          ],
        },
        {
          sql: `
            INSERT INTO activity_log (user_id, date, activity_type, count)
            VALUES (?, ?, 'practice', 1)
            ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
          `,
          args: [auth.session.userId, localDateKey(endedAt)],
        },
      ])
      await transaction.commit()
    }
  } finally {
    transaction.close()
  }

  if (completedByAnotherRequest) {
    const finishedResult = await auth.db.execute({
      sql: 'SELECT * FROM math_exam_attempts WHERE id = ? AND user_id = ?',
      args: [attemptId, auth.session.userId],
    })
    const finishedAttempt = finishedResult.rows[0]
    if (finishedAttempt?.finished_at) {
      return NextResponse.json(completedAttemptResult(
        attemptId,
        finishedAttempt as Record<string, unknown>
      ))
    }
    return NextResponse.json({ error: 'Attempt could not be completed' }, { status: 409 })
  }

  return NextResponse.json({
    attemptId,
    pointsEarned,
    pointsPossible,
    percentage: pointsPossible ? Math.round(pointsEarned / pointsPossible * 100) : 0,
    graded,
  })
}
