import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { approveTutorSignup, declineTutorSignup } from '@/lib/tutor-approvals'

async function readRequestId(req: NextRequest): Promise<string | null> {
  const body = await req.json().catch(() => null)
  const requestId = body && typeof body === 'object' ? (body as Record<string, unknown>).requestId : null
  return typeof requestId === 'string' && requestId.length > 0 ? requestId : null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestId = await readRequestId(req)
  if (!requestId) {
    return NextResponse.json({ error: 'Choose a tutor request to approve.' }, { status: 400 })
  }

  const db = await getDb()
  const result = await approveTutorSignup(db, requestId)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.reason === 'not_found' ? 404 : 409 },
    )
  }

  return NextResponse.json({ ok: true, tutor: result.tutor })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestId = await readRequestId(req)
  if (!requestId) {
    return NextResponse.json({ error: 'Choose a tutor request to decline.' }, { status: 400 })
  }

  const db = await getDb()
  const declined = await declineTutorSignup(db, requestId)
  if (!declined) {
    return NextResponse.json({ error: 'That tutor request was already handled.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
