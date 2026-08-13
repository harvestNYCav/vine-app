import Link from 'next/link'
import getDb from '@/lib/db'
import { getCheckInDay, isCheckInDate, summarizeCheckInCounts } from '@/lib/check-ins'
import { todayString } from '@/lib/scheduling'
import CheckInDatePicker from './CheckInDatePicker'

function formatTime(value: number | null): string {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default async function AdminCheckInsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: requestedDate } = await searchParams
  const date = isCheckInDate(requestedDate) ? requestedDate : todayString()
  const db = await getDb()
  const day = await getCheckInDay(db, date)

  const tutorCounts = summarizeCheckInCounts(day.tutors)
  const studentCounts = summarizeCheckInCounts(day.students)

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Students</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Check-ins</h1>
        <p className="text-sm text-slate-500">
          Who tutors marked as here on a session day — themselves and their students.
        </p>
      </div>

      <CheckInDatePicker date={date} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-3xl font-bold text-slate-900">{tutorCounts.present}/{tutorCounts.total}</p>
          <p className="text-sm text-slate-500">Tutors here</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-3xl font-bold text-slate-900">{studentCounts.present}/{studentCounts.total}</p>
          <p className="text-sm text-slate-500">Students here</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-3xl font-bold text-slate-900">{studentCounts.total - studentCounts.marked}</p>
          <p className="text-sm text-slate-500">Students not marked yet</p>
        </div>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Tutors</h2>
        {day.tutors.length === 0 ? (
          <p className="text-sm text-slate-500">No tutors yet.</p>
        ) : (
          <div className="space-y-2">
            {day.tutors.map(tutor => (
              <div
                key={tutor.tutorId}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800">{tutor.tutorName}</span>
                <span className="flex items-center gap-3">
                  {tutor.recordedAt && (
                    <span className="text-xs text-slate-400">{formatTime(tutor.recordedAt)}</span>
                  )}
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    tutor.present === null
                      ? 'bg-slate-100 text-slate-500'
                      : tutor.present
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {tutor.present === null ? 'No check-in' : tutor.present ? 'Here' : 'Absent'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Students</h2>
        {day.students.length === 0 ? (
          <p className="text-sm text-slate-500">No students yet.</p>
        ) : (
          <div className="space-y-2">
            {day.students.map(student => (
              <div
                key={student.studentId}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{student.studentName}</p>
                  {student.recordedByName && (
                    <p className="text-xs text-slate-400">
                      Marked by {student.recordedByName}
                      {student.recordedAt ? ` · ${formatTime(student.recordedAt)}` : ''}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                  student.present === null
                    ? 'bg-slate-100 text-slate-500'
                    : student.present
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {student.present === null ? 'No check-in' : student.present ? 'Here' : 'Absent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
