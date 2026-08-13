import { redirect } from 'next/navigation'
import type { StudentViewResolution } from '@/lib/student-view'

/**
 * What a learner page shows when it has no student to show. Tutors and admins go
 * back to their own dashboards; a parent with no linked student is told to ask an
 * admin rather than being dropped on an empty page.
 */
export default function StudentViewFallback({
  resolution,
}: {
  resolution: Exclude<StudentViewResolution, { status: 'ok' }>
}) {
  if (resolution.status === 'not-a-viewer') {
    redirect(resolution.role === 'tutor' ? '/tutor' : resolution.role === 'admin' ? '/admin' : '/')
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-800">No student linked yet</h1>
        <p className="mt-2 text-sm text-amber-700">
          Hello {resolution.parentName}. Your account is not linked to a student yet, so there is
          nothing to show. Ask a program admin to connect your child to this parent account.
        </p>
      </div>
    </div>
  )
}
