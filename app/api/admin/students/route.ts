import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeTracks } from '@/lib/tracks'
import { normalizeGradeLevel } from '@/lib/grade-levels'
import { createStudentAccount } from '@/lib/student-accounts'

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
  const result = await createStudentAccount(db, rawBody)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.reason === 'conflict' ? 409 : 400 },
    )
  }

  return NextResponse.json({ ok: true, student: result.student }, { status: 201 })
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
    studentId,
    tutorIds: rawTutorIds,
    tracks: rawTracks,
    mathSpanishEnabled: rawMathSpanishEnabled,
    gradeLevel: rawGradeLevel,
  } = rawBody as Record<string, unknown>
  const tracks = normalizeTracks(rawTracks)
  const gradeLevel = normalizeGradeLevel(rawGradeLevel)
  const tutorIds = Array.isArray(rawTutorIds)
    ? [...new Set(rawTutorIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
  if (
    typeof studentId !== 'string'
    || studentId.length === 0
    || !Array.isArray(rawTutorIds)
    || typeof rawMathSpanishEnabled !== 'boolean'
    || tracks.length === 0
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (rawGradeLevel !== null && gradeLevel === null) {
    return NextResponse.json({ error: 'Grade level must be a number from 3 through 8, or unassigned' }, { status: 400 })
  }
  if ((tracks.includes('math') || tracks.includes('ela')) && gradeLevel === null) {
    return NextResponse.json({ error: 'Choose a grade level for students in the Math or ELA track' }, { status: 400 })
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

  const now = Date.now()
  const transaction = await db.transaction('write')
  try {
    await transaction.batch([
      { sql: 'DELETE FROM student_tutors WHERE student_id = ?', args: [studentId] },
      ...tutorIds.map(tutorId => ({
        sql: 'INSERT INTO student_tutors (student_id, tutor_id, created_at) VALUES (?, ?, ?)',
        args: [studentId, tutorId, now],
      })),
      { sql: 'DELETE FROM user_tracks WHERE user_id = ?', args: [studentId] },
      ...tracks.map(track => ({
        sql: 'INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, ?, ?)',
        args: [studentId, track, now],
      })),
      {
        sql: `
          INSERT INTO student_settings (user_id, math_spanish_enabled, grade_level, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            math_spanish_enabled = excluded.math_spanish_enabled,
            grade_level = excluded.grade_level,
            updated_at = excluded.updated_at
        `,
        args: [studentId, rawMathSpanishEnabled ? 1 : 0, gradeLevel, now],
      },
    ])
    await transaction.commit()
  } finally {
    transaction.close()
  }

  return NextResponse.json({ ok: true })
}
