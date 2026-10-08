import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getModule } from '@/content/modules'
import { todayString } from '@/lib/scheduling'
import { recordDeckProgress } from '@/lib/session-metrics'

const MAX_SLIDES = 200

// Called by the tutor's lesson deck as slides change and while it stays open (see TrackedTutorDeck).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleSlug, slideIndex, slideCount, section, activeMs } = await req.json()
  if (typeof moduleSlug !== 'string' || !getModule(moduleSlug)) {
    return NextResponse.json({ error: 'Unknown lesson' }, { status: 400 })
  }
  if (
    !Number.isInteger(slideCount) || slideCount < 1 || slideCount > MAX_SLIDES ||
    !Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= slideCount ||
    typeof section !== 'string' || section.length > 100 ||
    typeof activeMs !== 'number' || !Number.isFinite(activeMs)
  ) {
    return NextResponse.json({ error: 'Invalid progress report' }, { status: 400 })
  }

  const db = await getDb()
  await recordDeckProgress(db, {
    tutorId: session.userId,
    date: todayString(),
    moduleSlug,
    slideIndex,
    slideCount,
    section,
    activeMs,
  })
  return NextResponse.json({ ok: true })
}
