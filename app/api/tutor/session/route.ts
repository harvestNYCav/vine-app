import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { randomUUID } from 'crypto'

type SessionRow = {
  id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number | bigint; created_at: number | bigint
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function toSessionJson(row: SessionRow) {
  return {
    id: row.id,
    date: row.date,
    moduleSlug: row.module_slug,
    tutorId: row.tutor_id,
    homeworkAssigned: Number(row.homework_assigned) === 1,
    createdAt: Number(row.created_at),
  }
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const today = todayString()

  let rowResult = await db.execute({ sql: 'SELECT * FROM sessions WHERE date = ?', args: [today] })
  let row = rowResult.rows[0] as unknown as SessionRow | undefined

  if (!row) {
    const id = randomUUID()
    const defaultSlug = ALL_MODULES[0].slug
    await db.execute({
      sql: 'INSERT INTO sessions (id, date, module_slug, tutor_id, homework_assigned, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      args: [id, today, defaultSlug, session.userId, Date.now()],
    })
    rowResult = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [id] })
    row = rowResult.rows[0] as unknown as SessionRow
  }

  const prevResult = await db.execute({
    sql: 'SELECT * FROM sessions WHERE date < ? ORDER BY date DESC LIMIT 1',
    args: [today],
  })
  const prevRow = prevResult.rows[0] as unknown as SessionRow | undefined

  return NextResponse.json({
    session: toSessionJson(row),
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

  const db = await getDb()
  const today = todayString()
  const existingResult = await db.execute({ sql: 'SELECT id FROM sessions WHERE date = ?', args: [today] })
  const id = (existingResult.rows[0]?.id as string | undefined) ?? randomUUID()

  await db.execute({
    sql: `
      INSERT INTO sessions (id, date, module_slug, tutor_id, homework_assigned, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
      ON CONFLICT(date) DO UPDATE SET module_slug = excluded.module_slug
    `,
    args: [id, today, moduleSlug, session.userId, Date.now()],
  })

  const rowResult = await db.execute({ sql: 'SELECT * FROM sessions WHERE date = ?', args: [today] })
  const row = rowResult.rows[0] as unknown as SessionRow

  return NextResponse.json({ session: toSessionJson(row) })
}
