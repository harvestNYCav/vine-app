import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })

  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT n.id, n.body, n.created_at, u.name as tutor_name
          FROM tutor_notes n
          JOIN users u ON u.id = n.tutor_id
          WHERE n.student_id = ?
          ORDER BY n.created_at DESC
          LIMIT 20`,
    args: [studentId],
  })

  return NextResponse.json({ notes: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentId, body } = await req.json()
  if (!studentId || !body?.trim()) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = await getDb()
  const id = randomUUID()
  await db.execute({
    sql: 'INSERT INTO tutor_notes (id, student_id, tutor_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, studentId, session.userId, body.trim(), Date.now()],
  })

  return NextResponse.json({ ok: true, id })
}
