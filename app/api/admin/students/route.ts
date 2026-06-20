import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeTracks, setStudentTracks } from '@/lib/tracks'
import { setStudentTutorIds } from '@/lib/tutors'
import { setStudentSettings } from '@/lib/student-settings'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentId, tutorIds: rawTutorIds, tracks: rawTracks, mathSpanishEnabled } = await req.json()
  const tracks = normalizeTracks(rawTracks)
  const tutorIds = Array.isArray(rawTutorIds)
    ? [...new Set(rawTutorIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
  if (!studentId || tracks.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = await getDb()
  const studentResult = await db.execute({
    sql: "SELECT id FROM users WHERE id = ? AND role = 'student'",
    args: [studentId],
  })
  if (!studentResult.rows[0]) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  if (tutorIds.length > 0) {
    const tutorResult = await db.execute({
      sql: `SELECT id FROM users WHERE role = 'tutor' AND id IN (${tutorIds.map(() => '?').join(',')})`,
      args: tutorIds,
    })
    if (tutorResult.rows.length !== tutorIds.length) {
      return NextResponse.json({ error: 'One or more tutors were not found' }, { status: 404 })
    }
  }

  await setStudentTutorIds(db, studentId, tutorIds)
  await setStudentTracks(db, studentId, tracks)
  await setStudentSettings(db, studentId, {
    mathSpanishEnabled: Boolean(mathSpanishEnabled),
  })

  return NextResponse.json({ ok: true })
}
