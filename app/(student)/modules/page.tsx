import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { ALL_MODULES } from '@/content/modules'
import { getSkillLabel, SKILLS } from '@/lib/math'
import { SKILL_LESSONS } from '@/content/math-skills'
import ModeToggle from '../ModeToggle'
import LangToggle from '../LangToggle'
import { firstTrackPath, getStudentTracks } from '@/lib/tracks'
import { getStudentSettings } from '@/lib/student-settings'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Track } from '@/types'
import { getMathExamsForGrade } from '@/content/math-exams'
import { getElaExamsForGrade } from '@/content/ela-exams'
import Link from 'next/link'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
  BookOpen: '📚', Pencil: '✏️',
  Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
  MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
  Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
}

export default async function ModulesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; lang?: string }>
}) {
  const { mode, lang } = await searchParams

  const session = await getSession()
  if (!session) redirect('/')
  if (session.role === 'tutor') redirect('/tutor')
  if (session.role === 'admin') redirect('/admin')
  const db = await getDb()
  const tracks = await getStudentTracks(db, session.userId)
  if (tracks.length === 0) redirect('/tracks')

  const currentMode: Track = mode === 'math' ? 'math' : mode === 'ela' ? 'ela' : 'esl'
  if (!tracks.includes(currentMode)) redirect(firstTrackPath(tracks))

  if (currentMode === 'math') {
    const [mathResult, settings, examProgressResult] = await Promise.all([
      db.execute({
        sql: 'SELECT skill_mastery, diagnostic_done FROM math_progress WHERE user_id = ?',
        args: [session.userId],
      }),
      getStudentSettings(db, session.userId),
      db.execute({
        sql: 'SELECT * FROM math_exam_section_progress WHERE user_id = ?',
        args: [session.userId],
      }),
    ])
    const mathRow = mathResult.rows[0]
    const mastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery as string) : {}
    const diagDone = mathRow ? Number(mathRow.diagnostic_done) === 1 : false
    const canUseSpanish = settings.mathSpanishEnabled
    const isSpanish = canUseSpanish && lang === 'es'
    const assignedExams = getMathExamsForGrade(settings.gradeLevel)
    type ExamProgressRow = { exam_id: string; section_slug: string; completed_at: number | null }
    const examProgress = examProgressResult.rows as unknown as ExamProgressRow[]

    return (
      <div className="max-w-lg mx-auto w-full px-4 py-6">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold text-green-800">{isSpanish ? 'Habilidades' : 'Skills'}</h1>
          <div className="flex items-center gap-2">
            {canUseSpanish && (
              <Suspense>
                <LangToggle currentLang={isSpanish ? 'es' : 'en'} />
              </Suspense>
            )}
            <ModeToggle currentMode="math" availableTracks={tracks} />
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-6">{isSpanish ? 'Lecciones de habilidades matemáticas' : 'Math skill lessons'}</p>

        {!diagDone && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <p className="text-sm text-amber-800 font-medium">{isSpanish ? 'Completa el diagnóstico primero' : 'Complete the diagnostic first'}</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {isSpanish ? 'Ve a Práctica → Matemáticas para encontrar tu nivel inicial.' : 'Go to Practice → Math to find your starting level.'}
            </p>
          </div>
        )}

        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-bold text-gray-800">
                {isSpanish ? 'Lecciones del examen de Nueva York' : 'New York exam lessons'}
                {settings.gradeLevel ? ` · ${isSpanish ? 'Grado' : 'Grade'} ${settings.gradeLevel}` : ''}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{isSpanish ? 'Aprende y practica con preguntas oficiales publicadas' : 'Learn, then practice with official released questions'}</p>
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700">NYSED</span>
          </div>
          {settings.gradeLevel === null ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                {isSpanish ? 'Un administrador debe asignar tu grado.' : 'An admin needs to assign your grade.'}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {isSpanish ? 'Las lecciones del examen aparecerán aquí después de la asignación.' : 'Your state-exam lessons will appear here after that.'}
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {assignedExams.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {isSpanish ? `No hay exámenes publicados para el grado ${settings.gradeLevel}.` : `No released exams are available for Grade ${settings.gradeLevel}.`}
              </div>
            )}
            {assignedExams.map(exam => {
              const completed = examProgress.filter(row => row.exam_id === exam.id && row.completed_at).length
              const useSpanish = isSpanish && exam.supportedLanguages.includes('es')
              return (
                <Link key={exam.id} href={`/math/exams/${exam.slug}${useSpanish ? '?lang=es' : ''}`} className="block">
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl">🗽</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800">{useSpanish ? exam.title.es : exam.title.en}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {exam.year} · {exam.sections.length} {useSpanish ? 'áreas de aprendizaje' : 'learning sections'} · {exam.standardsFramework}
                          {isSpanish && !useSpanish ? ' · Solo en inglés' : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        completed > 0 ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500'
                      }`}>
                        {completed}/{exam.sections.length}
                      </span>
                    </div>
                    {completed > 0 && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${completed / exam.sections.length * 100}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
          )}
        </section>

        <div className="mb-3">
          <h2 className="font-bold text-gray-800">{isSpanish ? 'Habilidades aritméticas' : 'Arithmetic skills'}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{isSpanish ? 'Práctica adaptativa generada' : 'Generated adaptive practice'}</p>
        </div>
        <div className="space-y-3">
          {SKILLS.map(skill => {
            const m = mastery[skill.tag] ?? 0
            const pct = Math.round(m * 100)
            const lesson = SKILL_LESSONS[skill.tag]
            return (
              <a key={skill.tag} href={`/vine-app/skills/${skill.tag}${isSpanish ? '?lang=es' : ''}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                    {lesson?.emoji ?? '🔢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{getSkillLabel(skill, isSpanish)}</p>
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
                    {pct >= 85 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{isSpanish ? 'Dominado ✓' : 'Mastered ✓'}</span>}
                    {pct > 0 && pct < 85 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">{isSpanish ? 'En progreso' : 'In progress'}</span>}
                    {pct === 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{isSpanish ? 'Empezar →' : 'Start →'}</span>}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  // English modes
  const [taughtSlugs, settings, mpResult, elaExamProgressResult] = await Promise.all([
    getTaughtModuleSlugsForStudent(db, session.userId),
    getStudentSettings(db, session.userId),
    db.execute({
      sql: 'SELECT * FROM module_progress WHERE user_id = ?',
      args: [session.userId],
    }),
    db.execute({
      sql: 'SELECT * FROM ela_exam_section_progress WHERE user_id = ?',
      args: [session.userId],
    }),
  ])
  const visibleModules = ALL_MODULES.filter(mod => mod.track === currentMode && taughtSlugs.has(mod.slug))
  type ModuleProgressRow = { module_slug: string; vocab_viewed_at: number | null; homework_completed_at: number | null }
  type ElaExamProgressRow = { exam_id: string; section_slug: string; completed_at: number | null }
  const moduleProgress = mpResult.rows as unknown as ModuleProgressRow[]
  const elaExamProgress = elaExamProgressResult.rows as unknown as ElaExamProgressRow[]
  const assignedElaExams = currentMode === 'ela' ? getElaExamsForGrade(settings.gradeLevel) : []

  const getStatus = (slug: string) => {
    const p = moduleProgress.find(m => m.module_slug === slug)
    if (!p) return 'not-started'
    if (p.homework_completed_at) return 'homework-done'
    if (p.vocab_viewed_at) return 'reviewed'
    return 'not-started'
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold text-green-800">Lessons</h1>
        <ModeToggle currentMode={currentMode} availableTracks={tracks} />
      </div>
      <p className="text-gray-500 text-sm mb-6">{currentMode === 'ela' ? 'ELA' : 'ESL'}</p>

      {currentMode === 'ela' && (
        <section className="mb-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-bold text-gray-800">
                New York ELA exam lessons
                {settings.gradeLevel ? ` · Grade ${settings.gradeLevel}` : ''}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">Read the official passage, learn a strategy, then answer released multiple-choice questions</p>
            </div>
            <span className="rounded-full bg-purple-100 px-2 py-1 text-[11px] font-bold text-purple-700">NYSED</span>
          </div>

          {settings.gradeLevel === null ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">An admin needs to assign your grade.</p>
              <p className="mt-1 text-xs text-amber-700">Your Grade 3–8 state-exam lessons will appear here after that.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedElaExams.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No released ELA exams are available for Grade {settings.gradeLevel}.
                </div>
              )}
              {assignedElaExams.map(exam => {
                const sectionSlugs = new Set(exam.sections.map(section => section.slug))
                const completed = elaExamProgress.filter(row =>
                  row.exam_id === exam.id
                  && sectionSlugs.has(row.section_slug)
                  && row.completed_at
                ).length
                return (
                  <Link key={exam.id} href={`/ela/exams/${exam.slug}`} className="block">
                    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-2xl">📖</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800">{exam.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {exam.year} · {exam.sections.length} passage lessons · {exam.standardsFramework}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          completed > 0 ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500'
                        }`}>
                          {completed}/{exam.sections.length}
                        </span>
                      </div>
                      {completed > 0 && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-purple-100">
                          <div className="h-full rounded-full bg-purple-600" style={{ width: `${completed / exam.sections.length * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

      {visibleModules.length === 0 && currentMode !== 'ela' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-700 font-medium">No lessons taught yet.</p>
          <p className="text-amber-600 text-sm mt-1">Check back after your next Saturday session!</p>
        </div>
      )}

      {visibleModules.length > 0 && (
      <section>
        {currentMode === 'ela' && (
          <div className="mb-3">
            <h2 className="font-bold text-gray-800">Tutor lessons</h2>
            <p className="mt-0.5 text-xs text-gray-500">Lessons assigned in your tutoring sessions</p>
          </div>
        )}
        <div className="space-y-3">
        {visibleModules.map(mod => {
          const status = getStatus(mod.slug)
          return (
            <a key={mod.slug} href={`/vine-app/modules/${mod.slug}`}>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {MODULE_EMOJIS[mod.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{mod.titleEn}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{mod.vocab.length} words</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {status === 'homework-done' && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Homework done ✓</span>}
                  {status === 'reviewed' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">Reviewed</span>}
                  {status === 'not-started' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Start →</span>}
                </div>
              </div>
            </a>
          )
        })}
        </div>
      </section>
      )}
    </div>
  )
}
