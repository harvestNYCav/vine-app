import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { localDateKey } from '@/lib/dates'
import { getModule } from '@/content/modules'
import { getStudentTracks } from '@/lib/tracks'
import { getMatchingItems } from '@/lib/worksheet'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDb()
  const [mp, vp, ts, al] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM module_progress WHERE user_id = ?', args: [session.userId] }),
    db.execute({ sql: 'SELECT * FROM vocab_progress WHERE user_id = ?', args: [session.userId] }),
    db.execute({ sql: 'SELECT * FROM teaching_sessions WHERE user_id = ? ORDER BY started_at DESC', args: [session.userId] }),
    db.execute({ sql: 'SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 30', args: [session.userId] }),
  ])

  return NextResponse.json({
    moduleProgress: mp.rows,
    vocabProgress: vp.rows,
    teachingSessions: ts.rows,
    activityLog: al.rows,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: unknown; data?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { type, data } = body
  const db = await getDb()
  const today = localDateKey()

  if (type === 'vocab_viewed') {
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const { moduleSlug } = data as { moduleSlug?: unknown }
    if (typeof moduleSlug !== 'string') {
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
    }
    const mod = getModule(moduleSlug)
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    const tracks = await getStudentTracks(db, session.userId)
    if (!tracks.includes(mod.track)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.execute({
      sql: `
        INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count)
        VALUES (?, ?, ?, NULL, NULL, 0)
        ON CONFLICT(user_id, module_slug) DO UPDATE SET vocab_viewed_at = COALESCE(vocab_viewed_at, excluded.vocab_viewed_at)
      `,
      args: [session.userId, moduleSlug, Date.now()],
    })
    await db.execute({
      sql: `
        INSERT INTO activity_log (user_id, date, activity_type, count)
        VALUES (?, ?, 'module', 1)
        ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
      `,
      args: [session.userId, today],
    })
  }

  if (type === 'practice_completed') {
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const { moduleSlug, answers } = data as { moduleSlug?: unknown; answers?: unknown }
    if (typeof moduleSlug !== 'string' || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid practice results' }, { status: 400 })
    }
    const mod = getModule(moduleSlug)
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    const tracks = await getStudentTracks(db, session.userId)
    if (!tracks.includes(mod.track)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const answerByQuestionId = new Map(
      answers
        .filter((item): item is { questionId: string; answer: unknown } =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as { questionId?: unknown }).questionId === 'string' &&
          'answer' in item
        )
        .map(item => [item.questionId, item.answer])
    )
    if (answerByQuestionId.size !== mod.quiz.length) {
      return NextResponse.json({ error: 'Every quiz question must be answered' }, { status: 400 })
    }

    const graded = mod.quiz.map(question => ({
      questionId: question.id,
      correct: String(answerByQuestionId.get(question.id) ?? '') === question.answer,
    }))
    const score = Math.round((graded.filter(result => result.correct).length / mod.quiz.length) * 100)
    const wordResults = mod.vocab.slice(0, mod.quiz.length).map((vocab, index) => ({
      wordId: `${mod.slug}:${vocab.id}`,
      correct: graded[index]?.correct ?? false,
    }))

    await db.execute({
      sql: `
        INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count)
        VALUES (?, ?, NULL, ?, ?, 0)
        ON CONFLICT(user_id, module_slug) DO UPDATE SET practice_completed_at = ?, practice_score = ?
      `,
      args: [session.userId, moduleSlug, Date.now(), score, Date.now(), score],
    })
    await db.execute({
      sql: `
        INSERT INTO activity_log (user_id, date, activity_type, count)
        VALUES (?, ?, 'practice', 1)
        ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
      `,
      args: [session.userId, today],
    })

    for (const { wordId, correct } of wordResults) {
      const existingResult = await db.execute({
        sql: 'SELECT * FROM vocab_progress WHERE user_id = ? AND word_id = ?',
        args: [session.userId, wordId],
      })
      if (existingResult.rows[0]) {
        if (correct) {
          await db.execute({
            sql: 'UPDATE vocab_progress SET correct_count = correct_count + 1, interval = MIN(interval * 2, 7), next_review_at = ? WHERE user_id = ? AND word_id = ?',
            args: [Date.now() + 3 * 24 * 60 * 60 * 1000, session.userId, wordId],
          })
        } else {
          await db.execute({
            sql: 'UPDATE vocab_progress SET incorrect_count = incorrect_count + 1, interval = 1, next_review_at = ? WHERE user_id = ? AND word_id = ?',
            args: [Date.now() + 24 * 60 * 60 * 1000, session.userId, wordId],
          })
        }
      } else {
        const { randomUUID } = await import('crypto')
        await db.execute({
          sql: 'INSERT INTO vocab_progress (id, user_id, word_id, module_slug, interval, repetitions, next_review_at, correct_count, incorrect_count) VALUES (?, ?, ?, ?, 3, 1, ?, ?, ?)',
          args: [randomUUID(), session.userId, wordId, moduleSlug, Date.now() + 3 * 24 * 60 * 60 * 1000, correct ? 1 : 0, correct ? 0 : 1],
        })
      }
    }
  }

  if (type === 'homework_completed') {
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    const { moduleSlug, matchingAnswers, fillInBlankAnswers } = data as {
      moduleSlug?: unknown
      matchingAnswers?: unknown
      fillInBlankAnswers?: unknown
    }
    if (typeof moduleSlug !== 'string' || !Array.isArray(matchingAnswers) || !Array.isArray(fillInBlankAnswers)) {
      return NextResponse.json({ error: 'Invalid homework results' }, { status: 400 })
    }
    const mod = getModule(moduleSlug)
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    const tracks = await getStudentTracks(db, session.userId)
    if (!tracks.includes(mod.track)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const matchingItems = getMatchingItems(mod)
    const matchingByVocabId = new Map(
      matchingAnswers
        .filter((item): item is { vocabId: string; selectedEs: unknown } =>
          !!item && typeof item === 'object' && typeof (item as { vocabId?: unknown }).vocabId === 'string'
        )
        .map(item => [item.vocabId, item.selectedEs])
    )
    const matchingCorrect = matchingItems.filter(
      vocab => String(matchingByVocabId.get(vocab.id) ?? '') === vocab.es
    ).length

    const fillInByQuestionId = new Map(
      fillInBlankAnswers
        .filter((item): item is { questionId: string; answer: unknown } =>
          !!item && typeof item === 'object' && typeof (item as { questionId?: unknown }).questionId === 'string'
        )
        .map(item => [item.questionId, item.answer])
    )
    const fillInBlankCorrect = mod.worksheet.filter(
      question => String(fillInByQuestionId.get(question.id) ?? '').trim().toLowerCase() === question.answer.trim().toLowerCase()
    ).length

    const total = matchingItems.length + mod.worksheet.length
    const score = total > 0 ? Math.round(((matchingCorrect + fillInBlankCorrect) / total) * 100) : 0

    await db.execute({
      sql: `
        INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count, homework_completed_at, homework_score)
        VALUES (?, ?, NULL, NULL, NULL, 0, ?, ?)
        ON CONFLICT(user_id, module_slug) DO UPDATE SET homework_completed_at = ?, homework_score = ?
      `,
      args: [session.userId, moduleSlug, Date.now(), score, Date.now(), score],
    })
    await db.execute({
      sql: `
        INSERT INTO activity_log (user_id, date, activity_type, count)
        VALUES (?, ?, 'module', 1)
        ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
      `,
      args: [session.userId, today],
    })

    return NextResponse.json({ ok: true, score })
  }

  if (type !== 'vocab_viewed' && type !== 'practice_completed') {
    return NextResponse.json({ error: 'Invalid progress type' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
