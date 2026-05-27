import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { SKILLS } from '@/lib/math'
import ModeToggle from '../ModeToggle'

const SESSION_LABELS: Record<string, string> = {
  practice_5: '5 min', practice_10: '10 min',
  flat_10: '10 Q', flat_25: '25 Q',
  custom: 'Custom', diagnostic: 'Diagnostic',
}

function masteryColor(v: number) {
  if (v >= 0.75) return 'bg-green-500'
  if (v >= 0.4) return 'bg-yellow-400'
  return 'bg-red-400'
}

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const isMath = mode === 'math'

  const session = await getSession()
  const db = getDb()

  if (isMath) {
    const mathRow = db.prepare('SELECT * FROM math_progress WHERE user_id = ?').get(session!.userId) as {
      skill_mastery: string; current_skill: string | null; diagnostic_done: number
      total_problems: number; total_correct: number
      mistake_profile: string; skill_attempt_counts: string
    } | undefined

    const mastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery) : {}
    const profile: Record<string, number> = mathRow ? JSON.parse(mathRow.mistake_profile) : {}
    const counts: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_attempt_counts) : {}
    const currentSkill = mathRow?.current_skill ?? null
    const totalProblems = mathRow?.total_problems ?? 0
    const totalCorrect = mathRow?.total_correct ?? 0

    const recentSessions = db.prepare(
      'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 10'
    ).all(session!.userId) as Array<{
      id: string; session_type: string; started_at: number; ended_at: number
      total_problems: number; correct: number; accuracy: number; current_skill: string
    }>

    const groups = [
      { label: 'Addition & Subtraction', ops: ['addition', 'subtraction', 'mixed'] },
      { label: 'Multiplication & Division', ops: ['multiplication', 'division'] },
    ]
    const totalMistakes = Object.values(profile).reduce((a, b) => a + b, 0)

    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-green-800">Progress</h1>
          <ModeToggle currentMode="math" />
        </div>
        <p className="text-gray-500 text-sm mb-6">Math arithmetic</p>

        {/* Overall stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-green-700">{totalProblems}</p>
            <p className="text-sm text-gray-600 mt-0.5">Problems solved</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-blue-600">
              {totalProblems ? Math.round(totalCorrect / totalProblems * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-0.5">Overall accuracy</p>
          </div>
        </div>

        {/* Skill mastery — always show all skills */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">Skill Mastery</h3>
          {groups.map(g => {
            const skills = SKILLS.filter(s => g.ops.includes(s.operation))
            return (
              <div key={g.label} className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{g.label}</p>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  {skills.map(s => {
                    const pct = Math.round((mastery[s.tag] ?? 0) * 100)
                    const count = counts[s.tag] || 0
                    return (
                      <div key={s.tag}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm flex items-center gap-1.5 ${pct === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                            {s.label}
                            {s.tag === currentSkill && (
                              <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">current</span>
                            )}
                          </span>
                          <span className={`text-sm font-bold ${pct === 0 ? 'text-gray-300' : 'text-green-700'}`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          {pct > 0 && (
                            <div className={`h-2 rounded-full ${masteryColor(mastery[s.tag] ?? 0)}`} style={{ width: `${pct}%` }} />
                          )}
                        </div>
                        {count > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{count} problems practiced</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {totalProblems > 0 && (<>

            {/* Mistake profile */}
            {totalMistakes > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-3">Mistake Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(profile).filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <p className="text-2xl font-bold text-red-500">{v}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{k.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-700 mb-3">Recent Sessions</h3>
                <div className="space-y-2">
                  {recentSessions.map(s => {
                    const d = new Date(s.started_at)
                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const duration = s.ended_at - s.started_at
                    return (
                      <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{SESSION_LABELS[s.session_type] || s.session_type}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.total_problems} problems · {fmtTime(duration)} · {dateStr}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-green-700">{s.accuracy}%</p>
                          <p className="text-xs text-gray-400">{s.correct}/{s.total_problems}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ESL mode
  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE user_id = ?').all(session!.userId) as Array<{
    module_slug: string; vocab_viewed_at: number | null; practice_completed_at: number | null; teach_session_count: number; practice_score: number | null
  }>
  const vocabProgress = db.prepare('SELECT * FROM vocab_progress WHERE user_id = ?').all(session!.userId) as Array<{
    word_id: string; correct_count: number; incorrect_count: number
  }>
  const teachingSessions = db.prepare('SELECT * FROM teaching_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 10').all(session!.userId) as Array<{
    id: string; module_slug: string; started_at: number; phrases_taught: string; encouragement: string
  }>
  const activityLog = db.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 7').all(session!.userId) as Array<{
    date: string; activity_type: string; count: number
  }>

  const totalVocab = ALL_MODULES.reduce((sum, m) => sum + m.vocab.length, 0)
  const masteredWords = vocabProgress.filter(v => v.correct_count >= 3).length
  const practicedWords = vocabProgress.length
  const completedModules = moduleProgress.filter(m => m.practice_completed_at).length
  const totalTeachSessions = teachingSessions.length

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000)
    const date = d.toISOString().split('T')[0]
    const dayLog = activityLog.filter(a => a.date === date)
    const total = dayLog.reduce((s, a) => s + a.count, 0)
    const day = d.toLocaleDateString('en', { weekday: 'short' })
    return { date, day, total }
  }).reverse()

  const maxActivity = Math.max(...last7.map(d => d.total), 1)

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-green-800">Progress</h1>
        <ModeToggle currentMode="esl" />
      </div>
      <p className="text-gray-500 text-sm mb-6">Tu progreso</p>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-green-700">{completedModules}/{ALL_MODULES.length}</p>
          <p className="text-sm text-gray-600 mt-0.5">Lessons completed</p>
          <p className="text-xs text-gray-400">Lecciones</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-blue-600">{masteredWords}/{totalVocab}</p>
          <p className="text-sm text-gray-600 mt-0.5">Words mastered</p>
          <p className="text-xs text-gray-400">Palabras dominadas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-purple-600">{totalTeachSessions}</p>
          <p className="text-sm text-gray-600 mt-0.5">Teaching sessions</p>
          <p className="text-xs text-gray-400">Sesiones de enseñanza</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-orange-500">{practicedWords}</p>
          <p className="text-sm text-gray-600 mt-0.5">Words practiced</p>
          <p className="text-xs text-gray-400">Palabras practicadas</p>
        </div>
      </div>

      {/* Activity this week */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-700 mb-3">This week / Esta semana</h3>
        <div className="flex items-end gap-2 h-16">
          {last7.map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-green-500 rounded-t-lg transition-all"
                style={{ height: `${(day.total / maxActivity) * 100}%`, minHeight: day.total > 0 ? '4px' : '0' }}
              />
              <span className="text-xs text-gray-400">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module Progress */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-3">Lessons / Lecciones</h3>
        <div className="space-y-3">
          {ALL_MODULES.map(mod => {
            const p = moduleProgress.find(mp => mp.module_slug === mod.slug)
            const steps = [!!p?.vocab_viewed_at, !!p?.practice_completed_at, (p?.teach_session_count ?? 0) > 0]
            const completed = steps.filter(Boolean).length
            const pct = Math.round((completed / 3) * 100)
            return (
              <div key={mod.slug} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium text-gray-700">{mod.titleEn}</p>
                  <span className="text-sm text-gray-400">{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                  <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p?.vocab_viewed_at ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>Vocab</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p?.practice_completed_at ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>Quiz {p?.practice_score ? `${p.practice_score}%` : ''}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${(p?.teach_session_count ?? 0) > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>🎓 Taught</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Teaching Sessions */}
      {teachingSessions.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-700 mb-3">Teaching Sessions / Sesiones de enseñanza</h3>
          <div className="space-y-3">
            {teachingSessions.slice(0, 3).map(session => {
              const mod = ALL_MODULES.find(m => m.slug === session.module_slug)
              const phrases = JSON.parse(session.phrases_taught) as string[]
              return (
                <div key={session.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="font-medium text-gray-700">🎓 {mod?.titleEn || session.module_slug}</p>
                  <p className="text-xs text-gray-400 mb-2">{new Date(session.started_at).toLocaleDateString()}</p>
                  {phrases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {phrases.slice(0, 3).map((p, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
