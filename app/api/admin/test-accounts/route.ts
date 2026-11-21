import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { setTestAccount } from '@/lib/account-visibility'

// Marks a student, tutor or parent as a test account, or back as a real one.
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
  const { userId, isTest } = (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? rawBody
    : {}) as Record<string, unknown>
  if (typeof userId !== 'string' || userId.length === 0 || typeof isTest !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await getDb()
  const user = await setTestAccount(db, userId, isTest)
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, user: { ...user, isTest } })
}
