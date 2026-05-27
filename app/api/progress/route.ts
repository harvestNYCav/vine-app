import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE user_id = ?').all(session.userId)
  const vocabProgress = db.prepare('SELECT * FROM vocab_progress WHERE user_id = ?').all(session.userId)
  const teachingSessions = db.prepare('SELECT * FROM teaching_sessions WHERE user_id = ? ORDER BY started_at DESC').all(session.userId)
  const activityLog = db.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 30').all(session.userId)

  return NextResponse.json({ moduleProgress, vocabProgress, teachingSessions, activityLog })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, data } = body
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  if (type === 'vocab_viewed') {
    const { moduleSlug } = data
    db.prepare(`
      INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count)
      VALUES (?, ?, ?, NULL, NULL, 0)
      ON CONFLICT(user_id, module_slug) DO UPDATE SET vocab_viewed_at = COALESCE(vocab_viewed_at, excluded.vocab_viewed_at)
    `).run(session.userId, moduleSlug, Date.now())

    db.prepare(`
      INSERT INTO activity_log (user_id, date, activity_type, count)
      VALUES (?, ?, 'module', 1)
      ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
    `).run(session.userId, today)
  }

  if (type === 'practice_completed') {
    const { moduleSlug, score, wordResults } = data
    db.prepare(`
      INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count)
      VALUES (?, ?, NULL, ?, ?, 0)
      ON CONFLICT(user_id, module_slug) DO UPDATE SET practice_completed_at = ?, practice_score = ?
    `).run(session.userId, moduleSlug, Date.now(), score, Date.now(), score)

    db.prepare(`
      INSERT INTO activity_log (user_id, date, activity_type, count)
      VALUES (?, ?, 'practice', 1)
      ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
    `).run(session.userId, today)

    // Update vocab progress for each word result
    for (const { wordId, correct } of wordResults) {
      const existing = db.prepare('SELECT * FROM vocab_progress WHERE user_id = ? AND word_id = ?').get(session.userId, wordId) as { correct_count: number; incorrect_count: number } | undefined
      if (existing) {
        if (correct) {
          db.prepare('UPDATE vocab_progress SET correct_count = correct_count + 1, interval = MIN(interval * 2, 7), next_review_at = ? WHERE user_id = ? AND word_id = ?')
            .run(Date.now() + 3 * 24 * 60 * 60 * 1000, session.userId, wordId)
        } else {
          db.prepare('UPDATE vocab_progress SET incorrect_count = incorrect_count + 1, interval = 1, next_review_at = ? WHERE user_id = ? AND word_id = ?')
            .run(Date.now() + 24 * 60 * 60 * 1000, session.userId, wordId)
        }
      } else {
        const { randomUUID } = await import('crypto')
        db.prepare('INSERT INTO vocab_progress (id, user_id, word_id, module_slug, interval, repetitions, next_review_at, correct_count, incorrect_count) VALUES (?, ?, ?, ?, 3, 1, ?, ?, ?)')
          .run(randomUUID(), session.userId, wordId, moduleSlug, Date.now() + 3 * 24 * 60 * 60 * 1000, correct ? 1 : 0, correct ? 0 : 1)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
