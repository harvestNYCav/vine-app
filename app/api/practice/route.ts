import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getNextReviewAt } from '@/lib/spaced-repetition'
import type { Rating } from '@/lib/spaced-repetition'
import { ALL_MODULES } from '@/content/modules'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const now = Date.now()

  // Get words due for review
  const dueWords = db.prepare(`
    SELECT vp.*, mp.practice_completed_at
    FROM vocab_progress vp
    LEFT JOIN module_progress mp ON mp.user_id = vp.user_id AND mp.module_slug = vp.module_slug
    WHERE vp.user_id = ? AND vp.next_review_at <= ?
    ORDER BY vp.next_review_at ASC
    LIMIT 10
  `).all(session.userId, now) as Array<{ word_id: string; module_slug: string }>

  // Enrich with vocab data
  const cards = dueWords.flatMap(row => {
    const mod = ALL_MODULES.find(m => m.slug === row.module_slug)
    const vocab = mod?.vocab.find(v => `${row.module_slug}:${v.id}` === row.word_id)
    if (!vocab || !mod) return []
    return [{ wordId: row.word_id, moduleSlug: row.module_slug, ...vocab }]
  })

  return NextResponse.json({ cards })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { wordId, moduleSlug, rating } = await req.json() as { wordId: string; moduleSlug: string; rating: Rating }
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]
  const nextReviewAt = getNextReviewAt(rating)

  const existing = db.prepare('SELECT id FROM vocab_progress WHERE user_id = ? AND word_id = ?').get(session.userId, wordId)

  if (existing) {
    db.prepare(`
      UPDATE vocab_progress
      SET interval = ?, next_review_at = ?, repetitions = repetitions + 1,
          correct_count = correct_count + ?, incorrect_count = incorrect_count + ?
      WHERE user_id = ? AND word_id = ?
    `).run(
      rating === 'hard' ? 1 : rating === 'ok' ? 3 : 7,
      nextReviewAt,
      rating !== 'hard' ? 1 : 0,
      rating === 'hard' ? 1 : 0,
      session.userId,
      wordId
    )
  } else {
    db.prepare('INSERT INTO vocab_progress (id, user_id, word_id, module_slug, interval, repetitions, next_review_at, correct_count, incorrect_count) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
      .run(randomUUID(), session.userId, wordId, moduleSlug, rating === 'hard' ? 1 : rating === 'ok' ? 3 : 7, nextReviewAt, rating !== 'hard' ? 1 : 0, rating === 'hard' ? 1 : 0)
  }

  db.prepare(`
    INSERT INTO activity_log (user_id, date, activity_type, count)
    VALUES (?, ?, 'practice', 1)
    ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
  `).run(session.userId, today)

  return NextResponse.json({ ok: true })
}
