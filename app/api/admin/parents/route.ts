import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createParentAccount, setParentChildren, setParentSettings } from '@/lib/parents'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const db = await getDb()
  const result = await createParentAccount(db, rawBody)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.reason === 'conflict' ? 409 : 400 },
    )
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, parent: result.parent }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const {
    parentId,
    studentIds: rawStudentIds,
    spanishEnabled,
  } = rawBody as Record<string, unknown>
  if (
    typeof parentId !== 'string'
    || parentId.length === 0
    || !Array.isArray(rawStudentIds)
    || typeof spanishEnabled !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const studentIds = [...new Set(
    rawStudentIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
  )]

  const db = await getDb()
  const parentResult = await db.execute({
    sql: "SELECT id FROM users WHERE id = ? AND role = 'parent'",
    args: [parentId],
  })
  if (!parentResult.rows[0]) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
  }

  if (studentIds.length > 0) {
    const studentResult = await db.execute({
      sql: `SELECT id FROM users WHERE role = 'student' AND id IN (${studentIds.map(() => '?').join(',')})`,
      args: studentIds,
    })
    if (studentResult.rows.length !== studentIds.length) {
      return NextResponse.json({ error: 'One or more students were not found' }, { status: 404 })
    }
  }

  await setParentChildren(db, parentId, studentIds)
  await setParentSettings(db, parentId, { spanishEnabled })

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
