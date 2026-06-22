import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import LogoutButton from '../LogoutButton'
import { filterModulesByTracks, getStudentTracks } from '@/lib/tracks'
import { redirect } from 'next/navigation'
import { localDateKey } from '@/lib/dates'
import HomeGreeting from './HomeGreeting'

function getStreak(activityLog: Array<{ date: string }>): number {
  if (!activityLog.length) return 0
  const dates = [...new Set(activityLog.map(a => a.date))].sort().reverse()
  const today = localDateKey()
  const yesterday = localDateKey(Date.now() - 86400000)
  if (dates[0] !== today && dates[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev.getTime() - curr.getTime()) / 86400000
    if (diff === 1) streak++
    else break
  }
  return streak
}

export default async function HomePage() {
  const session = await getSession()
  const db = await getDb()

  const tracks = await getStudentTracks(db, session!.userId)
  if (tracks.length === 0) redirect('/tracks')
  const visibleModules = filterModulesByTracks(ALL_MODULES, tracks)
  const visibleModuleSlugs = new Set(visibleModules.map(mod => mod.slug))
  const hasMath = tracks.includes('math')

  const [mpResult, alResult, vmResult, tsResult, mathResult, msResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM module_progress WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 30', args: [session!.userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as count FROM vocab_progress WHERE user_id = ? AND correct_count >= 3', args: [session!.userId] }),
    db.execute({ sql: 'SELECT COUNT(*) as count FROM teaching_sessions WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT total_problems, total_correct, diagnostic_done FROM math_progress WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT started_at FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 30', args: [session!.userId] }),
  ])

  type ModuleProgressRow = { module_slug: string; vocab_viewed_at: number | null; practice_completed_at: number | null; teach_session_count: number }
  const moduleProgress = mpResult.rows as unknown as ModuleProgressRow[]
  type MathSessionRow = { started_at: number }
  const mathSessions = msResult.rows as unknown as MathSessionRow[]
  const activityLog = [
    ...(alResult.rows as unknown as Array<{ date: string }>),
    ...mathSessions.map(row => ({ date: localDateKey(Number(row.started_at)) })),
  ]
  const vocabMastered = vmResult.rows[0] as unknown as { count: number }
  const teachSessions = tsResult.rows[0] as unknown as { count: number }
  const mathProgressRow = mathResult.rows[0] as unknown as { total_problems: number; total_correct: number; diagnostic_done: number } | undefined

  const streak = getStreak(activityLog)
  const completedModules = moduleProgress.filter(m => m.practice_completed_at && visibleModuleSlugs.has(m.module_slug)).length

  const getModuleStatus = (slug: string) => {
    const p = moduleProgress.find(m => m.module_slug === slug)
    if (!p) return 'not-started'
    if (p.teach_session_count > 0) return 'taught'
    if (p.practice_completed_at) return 'practiced'
    if (p.vocab_viewed_at) return 'started'
    return 'not-started'
  }

  const statusColors: Record<string, string> = {
    'not-started': 'bg-white border-gray-200',
    started: 'bg-yellow-50 border-yellow-300',
    practiced: 'bg-green-50 border-green-300',
    taught: 'bg-emerald-100 border-emerald-400',
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <HomeGreeting />
          <h1 className="text-2xl font-bold text-green-800">{session!.name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full">
            <span className="text-lg">🔥</span>
            <span className="font-bold text-orange-700">{streak}</span>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-700">{completedModules}</p>
          <p className="text-xs text-gray-500 mt-0.5">Lessons done</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{vocabMastered.count}</p>
          <p className="text-xs text-gray-500 mt-0.5">Words learned</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-purple-600">{teachSessions.count}</p>
          <p className="text-xs text-gray-500 mt-0.5">Times taught</p>
        </div>
      </div>

      <a href="/vine-app/tracks" className="block mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-gray-400 font-semibold">Tracks</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              {tracks.map(track => track.toUpperCase()).join(' · ')}
            </p>
          </div>
          <span className="text-gray-300 text-lg">→</span>
        </div>
      </a>

      {/* Math Practice Banner */}
      {hasMath && (
        <a href="/vine-app/practice?mode=math" className="block mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">➕</span>
              <div>
                <p className="font-semibold text-sm text-gray-800">Math Practice</p>
                <p className="text-xs text-gray-500">
                  {mathProgressRow && Number(mathProgressRow.total_problems) > 0
                    ? `${Number(mathProgressRow.total_problems)} problems · ${Math.round(Number(mathProgressRow.total_correct) / Number(mathProgressRow.total_problems) * 100)}% accuracy`
                    : 'Find your starting level'}
                </p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">→</span>
          </div>
        </a>
      )}

      {/* Teaching Mode Banner */}
      {visibleModules.length > 0 && (
      <a href={tracks.includes('esl') ? '/vine-app/modules' : '/vine-app/modules?mode=ela'} className="block mb-6">
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-4 shadow-md text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <p className="font-bold text-lg">Become the Teacher!</p>
              <p className="text-green-200 text-xs mt-0.5">Teach Carlos English with AI</p>
            </div>
          </div>
        </div>
      </a>
      )}

      {/* Modules Grid */}
      <div className="mb-4">
        <h2 className="font-bold text-gray-700 mb-3">
          Lessons
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {visibleModules.map(mod => {
            const status = getModuleStatus(mod.slug)
            return (
              <a key={mod.slug} href={`/vine-app/modules/${mod.slug}`}>
                <div className={`rounded-2xl p-4 border-2 ${statusColors[status]} shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="text-2xl mb-2">{
                    mod.icon === 'Hand' ? '👋' :
                    mod.icon === 'Train' ? '🚇' :
                    mod.icon === 'ShoppingCart' ? '🛒' :
                    mod.icon === 'Users' ? '👨‍👩‍👧' :
                    mod.icon === 'Shirt' ? '👕' :
                    mod.icon === 'BookOpen' ? '📚' :
                    mod.icon === 'Pencil' ? '✏️' :
                    '💬'
                  }</div>
                  <p className="font-semibold text-sm text-gray-800 leading-tight">{mod.titleEn}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mod.titleEs}</p>
                  {status === 'taught' && <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Taught!</p>}
                  {status === 'practiced' && <p className="text-xs text-green-600 mt-1 font-medium">✓ Practiced</p>}
                  {status === 'started' && <p className="text-xs text-yellow-600 mt-1 font-medium">In progress</p>}
                  {status === 'not-started' && <p className="text-xs text-gray-400 mt-1">Not started</p>}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
