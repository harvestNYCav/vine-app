import getDb from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ESL_LEVELS, ESL_PLACEMENT_STAGES } from '@/content/esl-placement'
import { getModule } from '@/content/modules'
import EslPlacementRunner from './EslPlacementRunner'

export default async function EslPlacementPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  const db = await getDb()
  const result = await db.execute({
    sql: "SELECT id, name FROM users WHERE id = ? AND role = 'student'",
    args: [studentId],
  })
  const student = result.rows[0]
  if (!student) notFound()

  const levels = ESL_LEVELS.map(level => ({
    ...level,
    startLessonTitle: getModule(level.startModuleSlug)?.titleEn ?? level.startModuleSlug,
  }))

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/tutor/${studentId}`} className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <div>
          <h1 className="text-xl font-bold text-amber-800">ESL placement test</h1>
          <p className="text-gray-500 text-sm">{String(student.name)} · 10–15 minutes</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700 mb-6 space-y-1">
        <p>Ask each question out loud. If there&apos;s a card, show it to the student, and read it aloud if they can&apos;t read it.</p>
        <p>Speak slowly. You can repeat a question once. Don&apos;t correct mistakes during the test.</p>
        <p>Mark <b>✓</b> if the answer shows the skill, even with small mistakes, and <b>✗</b> if not.</p>
      </div>

      <EslPlacementRunner studentId={studentId} stages={ESL_PLACEMENT_STAGES} levels={levels} />
    </div>
  )
}
