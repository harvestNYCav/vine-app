import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const today = new Date().toISOString().slice(0, 10)

  const result = await db.execute({
    sql: 'UPDATE sessions SET homework_assigned = 1 WHERE date = ?',
    args: [today],
  })
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'No session for today' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
