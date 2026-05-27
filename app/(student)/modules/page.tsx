import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import Link from 'next/link'
import { ALL_MODULES } from '@/content/modules'
import { SKILLS } from '@/lib/math'
import { SKILL_LESSONS } from '@/content/math-skills'
import ModeToggle from '../ModeToggle'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬'
}

export default async function ModulesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const isMath = mode === 'math'

  const session = await getSession()
  const db = getDb()

  if (isMath) {
    const mathRow = db.prepare('SELECT skill_mastery, diagnostic_done FROM math_progress WHERE user_id = ?').get(session!.userId) as {
      skill_mastery: string; diagnostic_done: number
    } | undefined
    const mastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery) : {}
    const diagDone = mathRow?.diagnostic_done === 1

    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-green-800">Skills</h1>
          <ModeToggle currentMode="math" />
        </div>
        <p className="text-gray-500 text-sm mb-6">Math skill lessons</p>

        {!diagDone && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-sm text-amber-800 font-medium">Complete the diagnostic first</p>
            <p className="text-xs text-amber-700 mt-0.5">Go to Practice → Math to find your starting level.</p>
          </div>
        )}

        <div className="space-y-3">
          {SKILLS.map(skill => {
            const m = mastery[skill.tag] ?? 0
            const pct = Math.round(m * 100)
            const lesson = SKILL_LESSONS[skill.tag]
            return (
              <Link key={skill.tag} href={`/skills/${skill.tag}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                    {lesson?.emoji ?? '🔢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{skill.label}</p>
                    {pct > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${m >= 0.75 ? 'bg-green-500' : m >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{pct}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {pct >= 85 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Mastered ✓</span>}
                    {pct > 0 && pct < 85 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">In progress</span>}
                    {pct === 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Start →</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // ESL mode
  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE user_id = ?').all(session!.userId) as Array<{
    module_slug: string; vocab_viewed_at: number | null; practice_completed_at: number | null; teach_session_count: number
  }>

  const getStatus = (slug: string) => {
    const p = moduleProgress.find(m => m.module_slug === slug)
    if (!p) return 'not-started'
    if (p.teach_session_count > 0) return 'taught'
    if (p.practice_completed_at) return 'practiced'
    if (p.vocab_viewed_at) return 'started'
    return 'not-started'
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-green-800">Lessons</h1>
        <ModeToggle currentMode="esl" />
      </div>
      <p className="text-gray-500 text-sm mb-6">Lecciones</p>

      <div className="space-y-3">
        {ALL_MODULES.map(mod => {
          const status = getStatus(mod.slug)
          return (
            <Link key={mod.slug} href={`/modules/${mod.slug}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {MODULE_EMOJIS[mod.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{mod.titleEn}</p>
                  <p className="text-sm text-gray-500">{mod.titleEs}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{mod.vocab.length} words / palabras</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {status === 'taught' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Taught ✓</span>}
                  {status === 'practiced' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Done ✓</span>}
                  {status === 'started' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">Started</span>}
                  {status === 'not-started' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Start →</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
