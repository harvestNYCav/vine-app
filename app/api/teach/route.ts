import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClient, buildTeachingSystemPrompt, buildSummaryPrompt } from '@/lib/claude'
import { getModule } from '@/content/modules'
import getDb from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, moduleSlug, sessionId, action } = await req.json()

  const mod = getModule(moduleSlug)
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const client = getClient()
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  // Summarize completed session
  if (action === 'summarize') {
    const summaryPrompt = buildSummaryPrompt(messages)
    const result = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: summaryPrompt }],
    })
    const text = result.content[0].type === 'text' ? result.content[0].text : '{}'
    let summary = { phrases: [] as string[], encouragement: '' }
    try {
      summary = JSON.parse(text)
    } catch {
      summary = { phrases: ['Great teaching session!'], encouragement: 'You did a wonderful job teaching today!' }
    }

    // Save session to DB
    const id = sessionId || randomUUID()
    db.prepare(`
      INSERT INTO teaching_sessions (id, user_id, module_slug, started_at, ended_at, message_count, phrases_taught, encouragement, transcript)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET ended_at = excluded.ended_at, message_count = excluded.message_count,
        phrases_taught = excluded.phrases_taught, encouragement = excluded.encouragement, transcript = excluded.transcript
    `).run(id, session.userId, moduleSlug, Date.now() - messages.length * 15000, Date.now(), messages.length, JSON.stringify(summary.phrases), summary.encouragement, JSON.stringify(messages))

    db.prepare(`
      UPDATE module_progress SET teach_session_count = teach_session_count + 1
      WHERE user_id = ? AND module_slug = ?
    `).run(session.userId, moduleSlug)

    db.prepare(`
      INSERT INTO module_progress (user_id, module_slug, vocab_viewed_at, practice_completed_at, practice_score, teach_session_count)
      VALUES (?, ?, NULL, NULL, NULL, 1)
      ON CONFLICT(user_id, module_slug) DO UPDATE SET teach_session_count = teach_session_count + 1
    `).run(session.userId, moduleSlug)

    db.prepare(`
      INSERT INTO activity_log (user_id, date, activity_type, count)
      VALUES (?, ?, 'teach', 1)
      ON CONFLICT(user_id, date, activity_type) DO UPDATE SET count = count + 1
    `).run(session.userId, today)

    return NextResponse.json(summary)
  }

  // Stream teaching conversation
  const systemPrompt = buildTeachingSystemPrompt(mod.titleEn, mod.teachingScenario)

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: systemPrompt,
    messages: messages.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
