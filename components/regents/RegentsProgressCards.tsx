import Link from 'next/link'
import {
  getRegentsExamsForCourse,
  getRegentsSectionQuestions,
  REGENTS_COURSE_LABELS,
} from '@/content/regents'
import type { RegentsCourse } from '@/content/regents/types'

type ProgressRow = {
  exam_id: string
  section_slug: string
  best_points: number
  best_possible: number
}

export default function RegentsProgressCards({
  courses,
  subject,
  progress,
  readOnly,
}: {
  courses: RegentsCourse[]
  subject: 'math' | 'ela'
  progress: ProgressRow[]
  readOnly: boolean
}) {
  const selected = courses.filter(course => subject === 'ela' ? course === 'english' : course !== 'english')
  return (
    <section className="mb-6">
      <h2 className="font-bold text-gray-700">Regents exam practice</h2>
      <p className="mb-3 mt-1 text-xs text-gray-500">Your best results across released, reviewed multiple-choice sections.</p>
      {selected.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">An admin needs to assign a Regents course.</div>
      ) : (
        <div className="space-y-3">
          {selected.map(course => {
            const exams = getRegentsExamsForCourse(course)
            const readySections = exams.flatMap(exam => exam.sections.filter(section => getRegentsSectionQuestions(exam, section).length > 0)
              .map(section => `${exam.id}:${section.slug}`))
            const keys = new Set(readySections)
            const attempts = progress.filter(row => keys.has(`${row.exam_id}:${row.section_slug}`) && Number(row.best_possible) > 0)
            const correct = attempts.reduce((sum, row) => sum + Number(row.best_points), 0)
            const possible = attempts.reduce((sum, row) => sum + Number(row.best_possible), 0)
            const card = (
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{REGENTS_COURSE_LABELS[course]}</h3>
                    <p className="mt-1 text-xs text-gray-500">{attempts.length}/{readySections.length} sections practiced</p>
                  </div>
                  <span className="text-lg font-bold text-blue-700">{possible ? Math.round(correct / possible * 100) : 0}%</span>
                </div>
              </div>
            )
            return readOnly ? <div key={course}>{card}</div> : <Link key={course} href={`/regents/${course}`} className="block">{card}</Link>
          })}
        </div>
      )}
    </section>
  )
}
