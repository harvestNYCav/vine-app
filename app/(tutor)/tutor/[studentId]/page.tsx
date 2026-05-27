import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { notFound } from 'next/navigation'
import { ALL_MODULES } from '@/content/modules'
import { SKILLS } from '@/lib/math'
import Link from 'next/link'
import PrepNoteButton from './PrepNoteButton'

function mathMasteryColor(v: number) {
  if (v >= 0.75) return 'bg-green-500'
  if (v >= 0.4) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params
  await getSession()
  const db = getDb()

  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(studentId) as {
    id: string; name: string; last_active: number
  } | undefined
  if (!student) notFound()

  const moduleProgress = db.prepare('SELECT * FROM module_progress WHERE user_id = ?').all(studentId) as Array<{
    module_slug: string; vocab_viewed_at: number | null; practice_completed_at: number | null; teach_session_count: number; practice_score: number | null
  }>
  const vocabProgress = db.prepare('SELECT * FROM vocab_progress WHERE user_id = ? ORDER BY incorrect_count DESC LIMIT 5').all(studentId) as Array<{
    word_id: string; module_slug: string; correct_count: number; incorrect_count: number
  }>
  const teachingSessions = db.prepare('SELECT * FROM teaching_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 5').all(studentId) as Array<{
    id: string; module_slug: string; started_at: number; phrases_taught: string
  }>
  const lastActivity = db.prepare('SELECT date FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(studentId) as { date: string } | undefined

  const mathRow = db.prepare('SELECT * FROM math_progress WHERE user_id = ?').get(studentId) as {
    skill_mastery: string; current_skill: string | null; diagnostic_done: number
    total_problems: number; total_correct: number; skill_attempt_counts: string
  } | undefined
  const mathMastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery) : {}
  const mathCounts: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_attempt_counts) : {}
  const mathTotal = mathRow?.total_problems ?? 0
  const mathCorrect = mathRow?.total_correct ?? 0
  const mathCurrentSkill = mathRow?.current_skill ?? null
  const mathDiagDone = mathRow?.diagnostic_done === 1

  const mathSessionCounts = db.prepare(
    'SELECT session_type, COUNT(*) as count FROM math_sessions WHERE user_id = ? GROUP BY session_type'
  ).all(studentId) as Array<{ session_type: string; count: number }>

  const completedModules = moduleProgress.filter(m => m.practice_completed_at).map(m => {
    const mod = ALL_MODULES.find(mm => mm.slug === m.module_slug)
    return mod?.titleEn || m.module_slug
  })

  const teachTopics = teachingSessions.map(s => {
    const mod = ALL_MODULES.find(mm => mm.slug === s.module_slug)
    return mod?.titleEn || s.module_slug
  })

  const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity.date).getTime()) / 86400000) : null

  // Struggling words: enrich with vocab data
  const strugglingWords = vocabProgress.flatMap(row => {
    const mod = ALL_MODULES.find(m => m.slug === row.module_slug)
    const vocab = mod?.vocab.find(v => `${row.module_slug}:${v.id}` === row.word_id)
    if (!vocab) return []
    return [{ ...vocab, correctCount: row.correct_count, incorrectCount: row.incorrect_count }]
  }).filter(w => w.incorrectCount > 0)

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tutor" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl font-bold text-amber-700">
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-amber-800">{student.name}</h1>
          <p className="text-gray-400 text-xs">
            {daysSince === null ? 'No activity yet' :
             daysSince === 0 ? 'Active today' :
             daysSince === 1 ? 'Active yesterday' :
             `Last active ${daysSince} days ago`}
          </p>
        </div>
      </div>

      {/* Saturday Prep Note */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📋</span>
          <h3 className="font-bold text-amber-800">Saturday Prep Note</h3>
        </div>
        <PrepNoteButton
          studentName={student.name}
          modulesCompleted={completedModules}
          strugglingWords={strugglingWords.map(w => w.en)}
          teachSessions={teachTopics}
          daysSinceLastVisit={daysSince}
        />
      </div>

      {/* Module Progress */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-3">Lessons / Lecciones</h3>
        <div className="space-y-2">
          {ALL_MODULES.map(mod => {
            const p = moduleProgress.find(mp => mp.module_slug === mod.slug)
            const steps = [!!p?.vocab_viewed_at, !!p?.practice_completed_at, (p?.teach_session_count ?? 0) > 0]
            const completed = steps.filter(Boolean).length
            return (
              <div key={mod.slug} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{mod.titleEn}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p?.vocab_viewed_at ? 'bg-blue-100 text-blue-600' : 'text-gray-300'}`}>Vocab</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p?.practice_completed_at ? 'bg-green-100 text-green-600' : 'text-gray-300'}`}>Quiz{p?.practice_score ? ` ${p.practice_score}%` : ''}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${(p?.teach_session_count ?? 0) > 0 ? 'bg-purple-100 text-purple-600' : 'text-gray-300'}`}>🎓</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    borderColor: completed === 3 ? '#10b981' : completed > 0 ? '#f59e0b' : '#e5e7eb',
                    color: completed === 3 ? '#10b981' : completed > 0 ? '#f59e0b' : '#9ca3af'
                  }}>
                  {completed}/3
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Struggling Words */}
      {strugglingWords.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">⚠️ Needs practice / Necesita practicar</h3>
          <div className="space-y-2">
            {strugglingWords.map(w => (
              <div key={w.id} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{w.en}</p>
                  <p className="text-sm text-gray-500">{w.es}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-red-500">{w.incorrectCount} missed</p>
                  <p className="text-xs text-green-600">{w.correctCount} correct</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Math Progress */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-700 mb-3">➕ Math Progress</h3>
        {!mathDiagDone ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-sm text-gray-400">Diagnostic not yet taken</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-3">
              <div className="bg-white rounded-xl p-3 border border-gray-100 flex-1 text-center">
                <p className="text-xl font-bold text-green-700">{mathTotal}</p>
                <p className="text-xs text-gray-500">Problems</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 flex-1 text-center">
                <p className="text-xl font-bold text-blue-600">
                  {mathTotal ? Math.round(mathCorrect / mathTotal * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </div>

            {mathSessionCounts.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sessions</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'practice_5', label: '5 min' },
                    { key: 'practice_10', label: '10 min' },
                    { key: 'flat_10', label: '10 Q' },
                    { key: 'flat_25', label: '25 Q' },
                    { key: 'custom', label: 'Custom' },
                    { key: 'diagnostic', label: 'Diagnostic' },
                  ].map(({ key, label }) => {
                    const row = mathSessionCounts.find(r => r.session_type === key)
                    if (!row) return null
                    return (
                      <div key={key} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-sm font-bold text-green-700">{row.count}</span>
                        <span className="text-xs text-gray-500">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {[
              { label: 'Addition & Subtraction', ops: ['addition', 'subtraction', 'mixed'] },
              { label: 'Multiplication & Division', ops: ['multiplication', 'division'] },
            ].map(g => (
              <div key={g.label} className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{g.label}</p>
                <div className="bg-white rounded-xl p-3 border border-gray-100 space-y-2.5">
                  {SKILLS.filter(s => g.ops.includes(s.operation)).map(s => {
                    const pct = Math.round((mathMastery[s.tag] ?? 0) * 100)
                    const count = mathCounts[s.tag] || 0
                    return (
                      <div key={s.tag}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs flex items-center gap-1 ${pct === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                            {s.label}
                            {s.tag === mathCurrentSkill && (
                              <span className="bg-green-100 text-green-700 text-xs font-semibold px-1 py-0.5 rounded-full">current</span>
                            )}
                          </span>
                          <span className={`text-xs font-bold ${pct === 0 ? 'text-gray-300' : pct < 40 ? 'text-red-500' : 'text-green-700'}`}>
                            {pct > 0 ? `${pct}%` : count > 0 ? `${pct}%` : '—'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          {pct > 0 && (
                            <div className={`h-1.5 rounded-full ${mathMasteryColor(mathMastery[s.tag] ?? 0)}`} style={{ width: `${pct}%` }} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

          </>
        )}
      </div>

      {/* Teaching Sessions */}
      {teachingSessions.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-700 mb-3">🎓 Teaching Sessions</h3>
          <div className="space-y-2">
            {teachingSessions.map(s => {
              const mod = ALL_MODULES.find(mm => mm.slug === s.module_slug)
              const phrases = JSON.parse(s.phrases_taught) as string[]
              return (
                <div key={s.id} className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="font-medium text-sm text-gray-700">{mod?.titleEn}</p>
                  <p className="text-xs text-gray-400">{new Date(s.started_at).toLocaleDateString()}</p>
                  {phrases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {phrases.slice(0, 3).map((p, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{p}</span>
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
