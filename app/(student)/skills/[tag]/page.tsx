import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getSkillByTag } from '@/lib/math'
import { SKILL_LESSONS } from '@/content/math-skills'
import LangToggle from '../../LangToggle'
import { Suspense } from 'react'
import { getStudentTracks } from '@/lib/tracks'

function LangToggleWrapper({ currentLang }: { currentLang: 'en' | 'es' }) {
  return (
    <Suspense>
      <LangToggle currentLang={currentLang} />
    </Suspense>
  )
}

export default async function SkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { tag } = await params
  const { lang } = await searchParams
  const isSpanish = lang === 'es'

  const skill = getSkillByTag(tag)
  const lesson = SKILL_LESSONS[tag]
  if (!skill || !lesson) notFound()

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes('math')) notFound()

  const mathResult = await db.execute({
    sql: 'SELECT skill_mastery, skill_attempt_counts FROM math_progress WHERE user_id = ?',
    args: [session!.userId],
  })
  const mathRow = mathResult.rows[0]

  const mastery: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_mastery as string) : {}
  const counts: Record<string, number> = mathRow ? JSON.parse(mathRow.skill_attempt_counts as string) : {}

  const m = mastery[tag] ?? 0
  const pct = Math.round(m * 100)
  const attempts = counts[tag] ?? 0

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/vine-app/modules?mode=math" className="text-gray-400 hover:text-gray-600 text-2xl">←</a>
        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
          {lesson.emoji}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-green-800">{skill.label}</h1>
          <p className="text-gray-500 text-sm">Math · Arithmetic</p>
        </div>
        <LangToggleWrapper currentLang={isSpanish ? 'es' : 'en'} />
      </div>

      {/* Mastery progress (if started) */}
      {attempts > 0 && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-green-800">
              {isSpanish ? 'Tu dominio' : 'Your mastery'}
            </span>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">{pct}%</span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-green-700 mt-1.5">
            {isSpanish ? `${attempts} problemas practicados` : `${attempts} problems practiced`}
          </p>
        </div>
      )}

      {/* Description */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="font-bold text-gray-700 mb-2">
          {isSpanish ? 'Lo que aprenderás' : 'What you\'ll learn'}
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {isSpanish ? lesson.descriptionEs : lesson.description}
        </p>
      </div>

      {/* Example */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="font-bold text-gray-700 mb-4">
          {isSpanish ? 'Ejemplo' : 'Example'}
        </h2>
        <div className="py-2">
          <div className="mx-auto grid w-max grid-cols-[1.25ch_minmax(3ch,auto)] items-baseline gap-x-3 text-4xl font-bold tabular-nums">
            <div />
            <div className="text-right text-gray-800">{lesson.exampleA}</div>
            <div className="text-right text-gray-400 font-normal">{lesson.exampleOp}</div>
            <div className="text-right text-gray-800">{lesson.exampleB}</div>
            <div className="col-span-2 border-t-2 border-gray-300 my-3" />
            <div />
            <div className="text-right text-green-700">{lesson.exampleAnswer}</div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
          {isSpanish ? 'Consejo' : 'Tip'}
        </p>
        <p className="text-sm text-amber-800 leading-relaxed">
          {isSpanish ? lesson.tipEs : lesson.tip}
        </p>
      </div>

      {/* Practice button */}
      <a href={`/vine-app/practice?mode=math&skill=${tag}`} className="block">
        <button className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-2xl shadow active:scale-95 transition-transform">
          {isSpanish ? 'Practicar esta habilidad 📝' : 'Practice this skill 📝'}
        </button>
      </a>
    </div>
  )
}
