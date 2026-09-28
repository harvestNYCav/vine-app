import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { todayString } from '@/lib/scheduling'
import { getStudentTracks } from '@/lib/tracks'
import { assignLessonsToStudent, AssignmentStudentNotFoundError } from '@/lib/tutor-lesson-assignment'

// Adds several lessons to one student's session today, from the picker on the tutor's student page.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as { studentId?: unknown; moduleSlugs?: unknown } | null
  const studentId = body?.studentId
  const moduleSlugs = body?.moduleSlugs
  if (typeof studentId !== 'string' || !Array.isArray(moduleSlugs) || moduleSlugs.length === 0
    || !moduleSlugs.every(slug => typeof slug === 'string')) {
    return NextResponse.json({ error: 'Pick at least one lesson' }, { status: 400 })
  }

  const db = await getDb()
  const tracks = await getStudentTracks(db, studentId)
  const modules = moduleSlugs.map(slug => ALL_MODULES.find(mod => mod.slug === slug))
  // The picker only offers lessons in the student's tracks; adding a track stays a deliberate step
  // in the Lesson Library, which asks first.
  if (modules.some(mod => !mod || !tracks.includes(mod.track))) {
    return NextResponse.json({ error: "One or more lessons aren't in this student's tracks" }, { status: 400 })
  }

  try {
    const added = await assignLessonsToStudent(db, {
      studentId,
      moduleSlugs,
      date: todayString(),
      tutorId: session.userId,
    })
    return NextResponse.json({ added })
  } catch (error) {
    if (error instanceof AssignmentStudentNotFoundError) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    throw error
  }
}
