import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
  BookOpen: '📚', Pencil: '✏️',
  Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
  MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
  Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
}

export default async function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()

  const backHref = mod.track === 'ela' ? '/vine-app/modules?mode=ela' : '/vine-app/modules'

  const taughtSlugs = await getTaughtModuleSlugsForStudent(db, session!.userId)
  if (!taughtSlugs.has(slug)) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href={backHref} className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
            {MODULE_EMOJIS[mod.icon]}
          </div>
          <h1 className="text-xl font-bold text-green-800">{mod.titleEn}</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-700 font-medium">This lesson hasn&apos;t been taught yet.</p>
          <p className="text-amber-600 text-sm mt-1">Check back after your tutor covers it in a Saturday session.</p>
        </div>
      </div>
    )
  }

  const progressResult = await db.execute({
    sql: 'SELECT * FROM module_progress WHERE user_id = ? AND module_slug = ?',
    args: [session!.userId, slug],
  })
  const progress = progressResult.rows[0] as unknown as {
    vocab_viewed_at: number | null
    homework_completed_at: number | null
    homework_score: number | null
  } | undefined

  const reviewed = !!progress?.vocab_viewed_at
  const homeworkDone = !!progress?.homework_completed_at

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a href={backHref} className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
          {MODULE_EMOJIS[mod.icon]}
        </div>
        <div>
          <h1 className="text-xl font-bold text-green-800">{mod.titleEn}</h1>
          <p className="text-sm text-gray-500">{mod.titleEs}</p>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-6">{mod.descriptionEn}</p>

      {/* Action Buttons */}
      <div className="space-y-3">
        <a href={`/vine-app/modules/${slug}/review`} className="block">
          <button className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform">
            📖 Review Slides
            <span className="block text-sm font-normal opacity-80 mt-0.5">
              {reviewed ? 'Reviewed ✓' : `${mod.vocab.length} words from this lesson`}
            </span>
          </button>
        </a>

        <a href={`/vine-app/modules/${slug}/homework`} className="block">
          <button className="w-full bg-amber-600 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-amber-700 active:scale-95 transition-transform">
            📓 Homework Worksheet
            <span className="block text-sm font-normal opacity-80 mt-0.5">
              {homeworkDone ? `Done — ${progress?.homework_score}% ✓` : 'Matching + fill in the blank'}
            </span>
          </button>
        </a>
      </div>
    </div>
  )
}
