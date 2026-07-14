import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { randomUUID } from 'crypto'
import { todayString } from '@/lib/scheduling'

type SessionRow = {
  id: string; student_id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number | bigint; created_at: number | bigint
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function toSessionJson(row: SessionRow) {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    moduleSlug: row.module_slug,
    tutorId: row.tutor_id,
    homeworkAssigned: Number(row.homework_assigned) === 1,
    createdAt: Number(row.created_at),
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleSlug, date: rawDate, studentIds } = await req.json()
  if (!moduleSlug || !ALL_MODULES.find(m => m.slug === moduleSlug)) {
    return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0 || !studentIds.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'Select at least one student' }, { status: 400 })
  }
  const date = isValidDate(rawDate) ? rawDate : todayString()

  const db = await getDb()
  const sessions: ReturnType<typeof toSessionJson>[] = []

  for (const studentId of studentIds as string[]) {
    const existingResult = await db.execute({
      sql: 'SELECT id FROM sessions WHERE student_id = ? AND date = ?',
      args: [studentId, date],
    })
    const id = (existingResult.rows[0]?.id as string | undefined) ?? randomUUID()

    await db.execute({
      sql: `
        INSERT INTO sessions (id, student_id, date, module_slug, tutor_id, homework_assigned, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET module_slug = excluded.module_slug
      `,
      args: [id, studentId, date, moduleSlug, session.userId, Date.now()],
    })

    const rowResult = await db.execute({
      sql: 'SELECT * FROM sessions WHERE student_id = ? AND date = ?',
      args: [studentId, date],
    })
    sessions.push(toSessionJson(rowResult.rows[0] as unknown as SessionRow))
  }

  return NextResponse.json({ sessions })
}
