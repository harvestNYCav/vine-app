import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { todayString } from '@/lib/scheduling'
import { getStudentTracks } from '@/lib/tracks'
import { getStudentSettings } from '@/lib/student-settings'
import { assignExamSection, isExamSubject, unassignExamSection, type ExamSectionRef } from '@/lib/exam-assignments'
import { examSectionIsForGrade } from '@/lib/exam-sections'

type Parsed = { ok: true; studentId: string; ref: ExamSectionRef } | { ok: false; response: NextResponse }

async function parseRequest(req: NextRequest): Promise<Parsed> {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const { studentId, subject, examId, sectionSlug } = body ?? {}
  if (typeof studentId !== 'string' || !isExamSubject(subject) || typeof examId !== 'string' || typeof sectionSlug !== 'string') {
    return { ok: false, response: NextResponse.json({ error: 'Invalid exam section' }, { status: 400 }) }
  }
  return { ok: true, studentId, ref: { subject, examId, sectionSlug } }
}

// Tutors assign one released-exam section for today's session. It doesn't unlock anything (every
// section for the student's grade is already open); it puts the section on both schedules.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await parseRequest(req)
  if (!parsed.ok) return parsed.response

  const db = await getDb()
  const student = await db.execute({ sql: "SELECT id FROM users WHERE id = ? AND role = 'student'", args: [parsed.studentId] })
  if (student.rows.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
  const [tracks, settings] = await Promise.all([
    getStudentTracks(db, parsed.studentId),
    getStudentSettings(db, parsed.studentId),
  ])
  if (!tracks.includes(parsed.ref.subject) || !examSectionIsForGrade(parsed.ref, settings.gradeLevel)) {
    return NextResponse.json({ error: "That section isn't available for this student's track and grade" }, { status: 400 })
  }

  await assignExamSection(db, { ...parsed.ref, studentId: parsed.studentId, tutorId: session.userId, date: todayString() })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = await parseRequest(req)
  if (!parsed.ok) return parsed.response

  const db = await getDb()
  await unassignExamSection(db, { ...parsed.ref, studentId: parsed.studentId, date: todayString() })
  return NextResponse.json({ ok: true })
}
