import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import { buildSessionMetricsCsv } from '@/lib/session-metrics'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const csv = await buildSessionMetricsCsv(db)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vine-session-metrics-${todayString()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
