import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { GRADE_LEVELS } from '@/lib/grade-levels'
import { getTutorExamLibrary, type TutorExamLibraryFilters } from '@/lib/tutor-exam-library'

export default async function TutorExamLibraryPage({
  searchParams,
}: {
  searchParams: Promise<TutorExamLibraryFilters>
}) {
  const session = await getSession()
  if (!session || session.role !== 'tutor') notFound()
  const library = getTutorExamLibrary(await searchParams)

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link href="/tutor/lessons" className="text-sm font-medium text-amber-700 hover:underline">
        ← Lesson Library
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-green-800">ELA & Math exam lessons</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Browse Grade 3–8 lessons, passages, and released questions to prepare for your session.
        Open a section to preview its answers and explanations.
      </p>

      <form action="/vine-app/tutor/exams" method="get" className="my-6 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-gray-700">
            Subject
            <select name="subject" defaultValue={library.subject} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 font-normal">
              <option value="ela">ELA</option>
              <option value="math">Math</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Grade
            <select name="grade" defaultValue={library.grade} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 font-normal">
              {GRADE_LEVELS.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-sm font-semibold text-gray-700 sm:col-span-1">
            Exam year
            <select name="year" defaultValue={library.year} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 font-normal">
              <option value="all">All years</option>
              {library.years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 sm:w-auto">
          Apply filters
        </button>
      </form>

      <div className="space-y-6">
        {library.exams.map(exam => (
          <section key={exam.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">{exam.title}</h2>
            <p className="mt-1 text-xs text-gray-500">{exam.sections.length} sections · NYSED released questions</p>
            <ul className="mt-4 divide-y divide-gray-100">
              {exam.sections.map(section => (
                <li key={section.slug}>
                  <Link href={section.href} className="flex items-start gap-3 rounded-xl px-2 py-4 hover:bg-amber-50">
                    <span className="text-2xl" aria-hidden="true">{section.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-800">{section.title}</span>
                      <span className="mt-1 block text-xs text-gray-500">{section.questionCount} questions</span>
                    </span>
                    <span className="text-sm font-semibold text-amber-700">Preview →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {library.exams.length === 0 && <p className="text-sm text-gray-600">No exam lessons match these filters.</p>}
      </div>
    </main>
  )
}
