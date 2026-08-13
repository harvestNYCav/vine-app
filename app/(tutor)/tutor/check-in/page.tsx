import Link from 'next/link'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getCheckInDay, isCheckInDate } from '@/lib/check-ins'
import { filterTutorRosterStudents, getTutorStudentIds } from '@/lib/tutor-roster'
import { getTutorRosterScope } from '@/lib/tutor-roster-server'
import { todayString } from '@/lib/scheduling'
import CheckInControls from './CheckInControls'

export default async function TutorCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: requestedDate } = await searchParams
  const session = await getSession()
  const db = await getDb()
  const date = isCheckInDate(requestedDate) ? requestedDate : todayString()

  const [checkInDay, assignedStudentIds, rosterScope] = await Promise.all([
    getCheckInDay(db, date),
    getTutorStudentIds(db, session!.userId),
    getTutorRosterScope(session!.userId),
  ])

  const visibleStudents = filterTutorRosterStudents(
    checkInDay.students.map(student => ({ ...student, id: student.studentId })),
    assignedStudentIds,
    rosterScope,
  )
  const selfCheckIn = checkInDay.tutors.find(tutor => tutor.tutorId === session!.userId)

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/tutor" className="text-2xl text-gray-400 hover:text-gray-600">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-amber-800">Check-in</h1>
          <p className="text-sm text-gray-500">
            {date} · {rosterScope === 'assigned' ? 'your students' : 'all students'}
          </p>
        </div>
      </div>

      <CheckInControls
        date={date}
        tutorName={session!.name}
        initialSelfPresent={selfCheckIn?.present ?? null}
        initialStudents={visibleStudents.map(student => ({
          id: student.studentId,
          name: student.studentName,
          present: student.present,
          recordedByName: student.recordedByName,
        }))}
      />
    </div>
  )
}
