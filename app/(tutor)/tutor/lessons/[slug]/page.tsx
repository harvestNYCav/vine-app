import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { todayString, nextSaturday } from '@/lib/scheduling'
import ModuleSlideDeck from '@/components/ModuleSlideDeck'
import AssignToStudents from './AssignToStudents'
import getDb from '@/lib/db'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
  BookOpen: '📚', Pencil: '✏️',
  Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
  MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
  Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
}

export default async function LessonPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const today = todayString()
  const nextDate = nextSaturday()

  const db = await getDb()
  const studentsResult = await db.execute({
    sql: "SELECT id, name FROM users WHERE role = 'student' ORDER BY name",
    args: [],
  })
  const students = studentsResult.rows.map(row => ({ id: String(row.id), name: String(row.name) }))

  return (
    <div>
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/tutor/lessons" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
            {MODULE_EMOJIS[mod.icon] ?? '💬'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{mod.titleEn}</h1>
            <p className="text-sm text-gray-500">{mod.titleEs}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">{mod.descriptionEn}</p>

        <AssignToStudents moduleSlug={mod.slug} today={today} nextDate={nextDate} students={students} />

        <p className="text-xs text-gray-400 mt-4 text-center">Preview the full lesson below ↓</p>
      </div>

      <ModuleSlideDeck mod={mod} variant="tutor" />
    </div>
  )
}
