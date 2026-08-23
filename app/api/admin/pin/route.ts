import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { resetUserPin } from '@/lib/pin-reset'

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
  const result = await resetUserPin(db, rawBody)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.reason === 'not_found' ? 404 : 400 },
    )
  }

  return NextResponse.json({ ok: true, user: result.user })
}
