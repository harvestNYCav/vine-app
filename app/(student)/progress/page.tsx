import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { getSkillLabel, SKILLS } from '@/lib/math'
import ModeToggle from '../ModeToggle'
import LangToggle from '../LangToggle'
import { firstTrackPath, getStudentTracks } from '@/lib/tracks'
import { getStudentSettings } from '@/lib/student-settings'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Track } from '@/types'
import { MATH_EXAMS } from '@/content/math-exams'
import Link from 'next/link'

const SESSION_LABELS: Record<string, string> = {
  practice_5: '5 min', practice_10: '10 min',
  flat_10: '10 Q', flat_25: '25 Q',
  custom: 'Custom', diagnostic: 'Diagnostic',
}

const SESSION_LABELS_ES: Record<string, string> = {
  practice_5: '5 min', practice_10: '10 min',
  flat_10: '10 preg.', flat_25: '25 preg.',
  custom: 'Personalizada', diagnostic: 'Diagnóstico',
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
  searchParams: Promise<{ mode?: string; lang?: string }>
}) {
  const { mode, lang } = await searchParams

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (tracks.length === 0) redirect('/tracks')

  const currentMode: Track = mode === 'math' ? 'math' : mode === 'ela' ? 'ela' : 'esl'
  if (!tracks.includes(currentMode)) redirect(firstTrackPath(tracks))

  if (currentMode === 'math') {
    const [mathResult, sessionsResult, settings, examProgressResult] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM math_progress WHERE user_id = ?', args: [session!.userId] }),
      db.execute({ sql: 'SELECT * FROM math_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 10', args: [session!.userId] }),
      getStudentSettings(db, session!.userId),
      db.execute({ sql: 'SELECT * FROM math_exam_section_progress WHERE user_id = ?', args: [session!.userId] }),
    ])
    const canUseSpanish = settings.mathSpanishEnabled
    const isSpanish = canUseSpanish && lang === 'es'

    const mathRow = mathResult.rows[0]
    const mastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery as string) : {}
    const profile: Record<string, number> = mathRow ? JSON.parse(mathRow.mistake_profile as string) : {}
    const counts: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_attempt_counts as string) : {}
    const currentSkill = mathRow?.current_skill as string | null ?? null
    const totalProblems = mathRow ? Number(mathRow.total_problems) : 0
    const totalCorrect = mathRow ? Number(mathRow.total_correct) : 0
    type ExamProgressRow = {
      exam_id: string
      section_slug: string
      attempts: number
      best_points: number
      best_possible: number
      completed_at: number | null
    }
    const examProgress = examProgressResult.rows as unknown as ExamProgressRow[]

    type MathSessionRow = { id: string; session_type: string; started_at: number; ended_at: number; total_problems: number; correct: number; accuracy: number; current_skill: string }
    const recentSessions = sessionsResult.rows as unknown as MathSessionRow[]

    const groups = [
      { label: isSpanish ? 'Suma y resta' : 'Addition & Subtraction', ops: ['addition', 'subtraction', 'mixed'] },
      { label: isSpanish ? 'Multiplicación y división' : 'Multiplication & Division', ops: ['multiplication', 'division'] },
    ]
    const totalMistakes = Object.values(profile).reduce((a, b) => a + b, 0)

    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-green-800">{isSpanish ? 'Progreso' : 'Progress'}</h1>
          <div className="flex items-center gap-2">
            {canUseSpanish && (
              <Suspense>
                <LangToggle currentLang={isSpanish ? 'es' : 'en'} />
              </Suspense>
            )}
            <ModeToggle currentMode="math" availableTracks={tracks} />
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-6">{isSpanish ? 'Aritmética y práctica del examen estatal' : 'Arithmetic and state exam practice'}</p>

        {/* Overall stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-green-700">{totalProblems}</p>
            <p className="text-sm text-gray-600 mt-0.5">{isSpanish ? 'Problemas resueltos' : 'Problems solved'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-blue-600">
              {totalProblems ? Math.round(totalCorrect / totalProblems * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{isSpanish ? 'Precisión general' : 'Overall accuracy'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-gray-700">{isSpanish ? 'Lecciones del examen de Nueva York' : 'New York Exam Lessons'}</h3>
          <p className="mb-3 mt-1 text-xs text-gray-500">
            {isSpanish
              ? 'Puntuaciones de práctica; las respuestas escritas incluyen autoevaluación.'
              : 'Practice scores; written responses include learner self-assessment.'}
          </p>
          <div className="space-y-3">
            {MATH_EXAMS.flatMap(exam => exam.sections.map(section => {
              const row = examProgress.find(item => item.exam_id === exam.id && item.section_slug === section.slug)
              const percentage = row?.best_possible
                ? Math.round(Number(row.best_points) / Number(row.best_possible) * 100)
                : 0
              return (
                <Link
                  key={`${exam.id}:${section.slug}`}
                  href={`/math/exams/${exam.slug}/${section.slug}${isSpanish ? '?lang=es' : ''}`}
                  className="block"
                >
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">{section.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-gray-700">{isSpanish ? section.title.es : section.title.en}</p>
                          <span className={`text-sm font-bold ${percentage ? 'text-blue-700' : 'text-gray-300'}`}>{percentage}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
                        </div>
                        {row && (
                          <p className="mt-1 text-xs text-gray-400">
                            {Number(row.attempts)}{' '}
                            {Number(row.attempts) === 1
                              ? (isSpanish ? 'intento' : 'attempt')
                              : (isSpanish ? 'intentos' : 'attempts')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            }))}
          </div>
        </div>

        {/* Skill mastery */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-700 mb-3">{isSpanish ? 'Dominio de habilidades' : 'Skill Mastery'}</h3>
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
                            {getSkillLabel(s, isSpanish)}
                            {s.tag === currentSkill && (
                              <span className="bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{isSpanish ? 'actual' : 'current'}</span>
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
                          <p className="text-xs text-gray-400 mt-0.5">{isSpanish ? `${count} problemas practicados` : `${count} problems practiced`}</p>
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
          {totalMistakes > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-3">{isSpanish ? 'Errores frecuentes' : 'Mistake Profile'}</h3>
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

          {recentSessions.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-700 mb-3">{isSpanish ? 'Sesiones recientes' : 'Recent Sessions'}</h3>
              <div className="space-y-2">
                {recentSessions.map(s => {
                  const d = new Date(Number(s.started_at))
                  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const duration = Number(s.ended_at) - Number(s.started_at)
                  return (
                    <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{(isSpanish ? SESSION_LABELS_ES : SESSION_LABELS)[s.session_type] || s.session_type}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isSpanish ? `${Number(s.total_problems)} problemas` : `${Number(s.total_problems)} problems`} · {fmtTime(duration)} · {dateStr}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-green-700">{Number(s.accuracy)}%</p>
                        <p className="text-xs text-gray-400">{Number(s.correct)}/{Number(s.total_problems)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>)}
      </div>
    )
  }

  // English modes
  const taughtSlugs = await getTaughtModuleSlugsForStudent(db, session!.userId)
  const visibleModules = ALL_MODULES.filter(mod => mod.track === currentMode && taughtSlugs.has(mod.slug))
  const visibleModuleSlugs = new Set(visibleModules.map(mod => mod.slug))
  const [mpResult, vpResult, alResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM module_progress WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT * FROM vocab_progress WHERE user_id = ?', args: [session!.userId] }),
    db.execute({ sql: 'SELECT * FROM activity_log WHERE user_id = ? ORDER BY date DESC LIMIT 7', args: [session!.userId] }),
  ])

  type ModProgressRow = { module_slug: string; vocab_viewed_at: number | null; homework_completed_at: number | null; homework_score: number | null }
  type VocabProgressRow = { word_id: string; correct_count: number; incorrect_count: number }
  type ActivityRow = { date: string; activity_type: string; count: number }

  const moduleProgress = (mpResult.rows as unknown as ModProgressRow[]).filter(row => visibleModuleSlugs.has(row.module_slug))
  const vocabProgress = (vpResult.rows as unknown as VocabProgressRow[]).filter(row => visibleModuleSlugs.has(row.word_id.split(':')[0]))
  const activityLog = alResult.rows as unknown as ActivityRow[]

  const totalVocab = visibleModules.reduce((sum, m) => sum + m.vocab.length, 0)
  const masteredWords = vocabProgress.filter(v => Number(v.correct_count) >= 3).length
  const practicedWords = vocabProgress.length
  const completedModules = moduleProgress.filter(m => m.homework_completed_at).length
  const reviewedModules = moduleProgress.filter(m => m.vocab_viewed_at).length

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000)
    const date = d.toISOString().split('T')[0]
    const dayLog = activityLog.filter(a => a.date === date)
    const total = dayLog.reduce((s, a) => s + Number(a.count), 0)
    const day = d.toLocaleDateString('en', { weekday: 'short' })
    return { date, day, total }
  }).reverse()

  const maxActivity = Math.max(...last7.map(d => d.total), 1)

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-green-800">Progress</h1>
        <ModeToggle currentMode={currentMode} availableTracks={tracks} />
      </div>
      <p className="text-gray-500 text-sm mb-6">{currentMode === 'ela' ? 'ELA progress' : 'ESL progress'}</p>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-green-700">{completedModules}/{visibleModules.length}</p>
          <p className="text-sm text-gray-600 mt-0.5">Lessons completed</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-blue-600">{masteredWords}/{totalVocab}</p>
          <p className="text-sm text-gray-600 mt-0.5">Words mastered</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-purple-600">{reviewedModules}</p>
          <p className="text-sm text-gray-600 mt-0.5">Lessons reviewed</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-orange-500">{practicedWords}</p>
          <p className="text-sm text-gray-600 mt-0.5">Words practiced</p>
        </div>
      </div>

      {/* Activity this week */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-700 mb-3">This week</h3>
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
        <h3 className="font-bold text-gray-700 mb-3">Lessons</h3>
        <div className="space-y-3">
          {visibleModules.map(mod => {
            const p = moduleProgress.find(mp => mp.module_slug === mod.slug)
            const steps = [!!p?.vocab_viewed_at, !!p?.homework_completed_at]
            const completed = steps.filter(Boolean).length
            const pct = Math.round((completed / 2) * 100)
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p?.vocab_viewed_at ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>📖 Reviewed</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p?.homework_completed_at ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>📓 Homework {p?.homework_score ? `${p.homework_score}%` : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
