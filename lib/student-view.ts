import 'server-only'

import { cookies } from 'next/headers'
import type { Client } from '@libsql/client'
import { getSession } from './auth'
import {
  getParentChildren,
  getParentSettings,
  parentChildCookieName,
  selectParentChildId,
  type ParentChild,
} from './parents'
import { getStudentSettings, type StudentSettings } from './student-settings'
import type { Role } from '@/types'

/**
 * Who a learner page is about, and who is looking at it. Students see their own
 * data and can act on it; parents see the same pages for a linked student, read
 * only, with a Spanish toggle an admin grants them independently of the student.
 */
export interface StudentView {
  studentId: string
  studentName: string
  viewerRole: 'student' | 'parent'
  readOnly: boolean
  settings: StudentSettings
  spanishEnabled: boolean
  children: ParentChild[]
}

export type StudentViewResolution =
  | { status: 'ok'; view: StudentView }
  | { status: 'not-a-viewer'; role: Role | null }
  | { status: 'no-linked-student'; parentName: string }

export async function resolveStudentViewResult(db: Client): Promise<StudentViewResolution> {
  const session = await getSession()
  if (!session) return { status: 'not-a-viewer', role: null }

  if (session.role === 'student') {
    const settings = await getStudentSettings(db, session.userId)
    return {
      status: 'ok',
      view: {
        studentId: session.userId,
        studentName: session.name,
        viewerRole: 'student',
        readOnly: false,
        settings,
        spanishEnabled: settings.mathSpanishEnabled,
        children: [],
      },
    }
  }

  if (session.role !== 'parent') return { status: 'not-a-viewer', role: session.role }

  const [children, parentSettings, cookieStore] = await Promise.all([
    getParentChildren(db, session.userId),
    getParentSettings(db, session.userId),
    cookies(),
  ])
  const selectedId = selectParentChildId(
    children,
    cookieStore.get(parentChildCookieName(session.userId))?.value,
  )
  if (!selectedId) return { status: 'no-linked-student', parentName: session.name }

  const child = children.find(candidate => candidate.id === selectedId)!
  const settings = await getStudentSettings(db, child.id)
  return {
    status: 'ok',
    view: {
      studentId: child.id,
      studentName: child.name,
      viewerRole: 'parent',
      readOnly: true,
      settings,
      spanishEnabled: parentSettings.spanishEnabled,
      children,
    },
  }
}
