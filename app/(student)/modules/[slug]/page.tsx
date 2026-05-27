import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import Link from 'next/link'
import VocabSection from './VocabSection'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬'
}

export default async function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const session = await getSession()
  const db = getDb()
  const progress = db.prepare('SELECT * FROM module_progress WHERE user_id = ? AND module_slug = ?')
    .get(session!.userId, slug) as { practice_completed_at: number | null; teach_session_count: number } | undefined

  const canTeach = !!progress?.practice_completed_at || !!progress

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
          {MODULE_EMOJIS[mod.icon]}
        </div>
        <div>
          <h1 className="text-xl font-bold text-green-800">{mod.titleEn}</h1>
          <p className="text-gray-500 text-sm">{mod.titleEs}</p>
        </div>
      </div>

      {/* Vocab Section (client component for flip animation) */}
      <VocabSection vocab={mod.vocab} moduleSlug={slug} />

      {/* Action Buttons */}
      <div className="space-y-3 mt-6">
        <Link href={`/modules/${slug}/practice`} className="block">
          <button className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-green-800 active:scale-95 transition-transform">
            Practice Quiz 📝
            <span className="block text-sm font-normal opacity-80 mt-0.5">Cuestionario</span>
          </button>
        </Link>

        <Link href={`/modules/${slug}/teach`} className="block">
          <button className={`w-full text-lg font-semibold py-4 rounded-2xl shadow active:scale-95 transition-transform ${
            canTeach
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-100 text-gray-400 border border-gray-200'
          }`}>
            🎓 Teach It to Carlos!
            <span className="block text-sm font-normal opacity-80 mt-0.5">
              {canTeach ? '¡Enséñale a Carlos!' : 'Practice first to unlock / Practica primero'}
            </span>
          </button>
        </Link>
      </div>
    </div>
  )
}
