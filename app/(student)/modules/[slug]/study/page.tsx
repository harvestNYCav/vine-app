import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'
import { countMatchingRounds } from '@/lib/study'

export default async function StudyHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()
  const taughtSlugs = await getTaughtModuleSlugsForStudent(db, session!.userId)
  if (!taughtSlugs.has(slug)) notFound()

  const practicedResult = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM vocab_progress WHERE user_id = ? AND module_slug = ?',
    args: [session!.userId, slug],
  })
  const practicedCount = Number(practicedResult.rows[0]?.cnt ?? 0)

  const rounds = countMatchingRounds(mod.vocab.length)

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <a href={`/vine-app/modules/${slug}`} className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
        <h1 className="font-bold text-green-800">{mod.titleEn} — Study & Play</h1>
      </div>

      {practicedCount > 0 && (
        <p className="text-xs text-gray-400 mb-6 ml-9">
          {practicedCount} of {mod.vocab.length} words in your practice queue
        </p>
      )}
      {practicedCount === 0 && <div className="mb-6" />}

      <div className="space-y-3">
        <a href={`/vine-app/modules/${slug}/study/flashcards`} className="block">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-green-300 active:scale-95 transition-transform flex items-center gap-4">
            <span className="text-3xl">🗂️</span>
            <div>
              <p className="font-bold text-gray-800">Flashcards</p>
              <p className="text-sm text-gray-500">
                {mod.vocab.length} words · {mod.track === 'esl' ? 'flip, browse, rate' : 'browse, rate'}
              </p>
            </div>
          </div>
        </a>

        {mod.track === 'esl' && (
          <a href={`/vine-app/modules/${slug}/study/match`} className="block">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-green-300 active:scale-95 transition-transform flex items-center gap-4">
              <span className="text-3xl">🧩</span>
              <div>
                <p className="font-bold text-gray-800">Matching Game</p>
                <p className="text-sm text-gray-500">{rounds} round{rounds === 1 ? '' : 's'} · beat your best time</p>
              </div>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
