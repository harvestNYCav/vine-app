import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { randomUUID } from 'crypto'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const today = todayString()

  let row = db.prepare('SELECT * FROM sessions WHERE date = ?').get(today) as {
    id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number; created_at: number
  } | undefined

  if (!row) {
    const id = randomUUID()
    const defaultSlug = ALL_MODULES[0].slug
    db.prepare('INSERT INTO sessions (id, date, module_slug, tutor_id, homework_assigned, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
      id, today, defaultSlug, session.userId, Date.now()
    )
    row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as typeof row
  }

  const prevRow = db.prepare('SELECT * FROM sessions WHERE date < ? ORDER BY date DESC LIMIT 1').get(today) as typeof row | undefined

  return NextResponse.json({
    session: {
      id: row!.id,
      date: row!.date,
      moduleSlug: row!.module_slug,
      tutorId: row!.tutor_id,
      homeworkAssigned: row!.homework_assigned === 1,
      createdAt: row!.created_at,
    },
    previousModuleSlug: prevRow?.module_slug ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleSlug } = await req.json()
  if (!moduleSlug || !ALL_MODULES.find(m => m.slug === moduleSlug)) {
    return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
  }

  const db = getDb()
  const today = todayString()
  const existing = db.prepare('SELECT id FROM sessions WHERE date = ?').get(today) as { id: string } | undefined
  const id = existing?.id ?? randomUUID()

  db.prepare(`
    INSERT INTO sessions (id, date, module_slug, tutor_id, homework_assigned, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
    ON CONFLICT(date) DO UPDATE SET module_slug = excluded.module_slug
  `).run(id, today, moduleSlug, session.userId, Date.now())

  const row = db.prepare('SELECT * FROM sessions WHERE date = ?').get(today) as {
    id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number; created_at: number
  }

  return NextResponse.json({
    session: {
      id: row.id,
      date: row.date,
      moduleSlug: row.module_slug,
      tutorId: row.tutor_id,
      homeworkAssigned: row.homework_assigned === 1,
      createdAt: row.created_at,
    },
  })
}
