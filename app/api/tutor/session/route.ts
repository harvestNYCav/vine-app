import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { todayString } from '@/lib/scheduling'
import {
  assignTutorLesson,
  AssignmentStudentNotFoundError,
} from '@/lib/tutor-lesson-assignment'

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    moduleSlug,
    date: rawDate,
    studentIds,
    confirmTrackEnrollment,
    collisionAction: rawCollisionAction,
  } = await req.json()
  const module = ALL_MODULES.find(item => item.slug === moduleSlug)
  if (!moduleSlug || !module) {
    return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0 || !studentIds.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'Select at least one student' }, { status: 400 })
  }
  const date = isValidDate(rawDate) ? rawDate : todayString()
  const collisionAction = rawCollisionAction === 'replace' || rawCollisionAction === 'add'
    ? rawCollisionAction
    : undefined

  const db = await getDb()
  try {
    const result = await assignTutorLesson(db, {
      moduleSlug,
      moduleTrack: module.track,
      date,
      studentIds,
      tutorId: session.userId,
      confirmTrackEnrollment: confirmTrackEnrollment === true,
      collisionAction,
    })

    if (result.status === 'confirmation_required') {
      const collisions = result.collisions.map(collision => ({
        student: collision.student,
        lessons: collision.sessions.map(existing => {
          const existingModule = ALL_MODULES.find(item => item.slug === existing.moduleSlug)
          return {
            moduleSlug: existing.moduleSlug,
            title: existingModule?.titleEn ?? existing.moduleSlug,
          }
        }),
      }))
      return NextResponse.json({
        error: 'Assignment confirmation required.',
        requiresTrackConfirmation: result.studentsMissingTrack.length > 0,
        requiresCollisionConfirmation: collisions.length > 0,
        track: result.track,
        missingTrackStudents: result.studentsMissingTrack,
        collisions,
      }, { status: 409 })
    }

    return NextResponse.json({
      sessions: result.sessions,
      enrolledStudentIds: result.enrolledStudentIds,
    })
  } catch (error) {
    if (error instanceof AssignmentStudentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
