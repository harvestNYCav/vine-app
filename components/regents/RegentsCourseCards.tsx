import Link from 'next/link'
import { getRegentsExamReadyCount, getRegentsExamsForCourse, REGENTS_COURSE_LABELS } from '@/content/regents'
import type { RegentsCourse } from '@/content/regents/types'

export default function RegentsCourseCards({
  courses,
  subject,
  readOnly,
}: {
  courses: RegentsCourse[]
  subject: 'math' | 'ela'
  readOnly: boolean
}) {
  const selected = courses.filter(course => subject === 'ela' ? course === 'english' : course !== 'english')
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-bold text-gray-800">New York Regents courses</h2>
          <p className="mt-0.5 text-xs text-gray-500">Released multiple-choice exams, grouped by course and date</p>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700">NYSED</span>
      </div>
      {selected.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          An admin needs to assign a {subject === 'ela' ? 'Regents English' : 'Regents Math'} course before these lessons appear.
        </div>
      ) : (
        <div className="space-y-3">
          {selected.map(course => {
            const exams = getRegentsExamsForCourse(course)
            const ready = exams.reduce((count, exam) => count + getRegentsExamReadyCount(exam), 0)
            const card = (
              <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl">{course === 'english' ? '📖' : '📐'}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800">{REGENTS_COURSE_LABELS[course]}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{exams.length} exam administrations · {ready} questions ready</p>
                </div>
                <span className="text-sm font-semibold text-blue-700">Open →</span>
              </div>
            )
            return readOnly
              ? <div key={course}>{card}</div>
              : <Link key={course} href={`/regents/${course}`} className="block">{card}</Link>
          })}
        </div>
      )}
    </section>
  )
}
