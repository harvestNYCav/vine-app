import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getModule, ALL_MODULES } from '@/content/modules'
import { randomUUID } from 'crypto'
import ModuleSelector from './ModuleSelector'
import TutorVocabList from './TutorVocabList'
import HomeworkButton from './HomeworkButton'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

const STEPS = [
  { label: 'Warm-Up', sublabel: 'Review last week\'s vocabulary' },
  { label: 'Vocabulary', sublabel: 'Introduce today\'s new words' },
  { label: 'Role-Play', sublabel: 'Practice the scenario together' },
  { label: 'Homework', sublabel: 'Assign the take-home link' },
]

export default async function SessionPage() {
  const session = await getSession()
  const db = getDb()
  const today = todayString()

  let row = db.prepare('SELECT * FROM sessions WHERE date = ?').get(today) as {
    id: string; date: string; module_slug: string; tutor_id: string; homework_assigned: number; created_at: number
  } | undefined

  if (!row) {
    const id = randomUUID()
    db.prepare('INSERT INTO sessions (id, date, module_slug, tutor_id, homework_assigned, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
      id, today, ALL_MODULES[0].slug, session!.userId, Date.now()
    )
    row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as typeof row
  }

  const prevRow = db.prepare('SELECT * FROM sessions WHERE date < ? ORDER BY date DESC LIMIT 1').get(today) as {
    module_slug: string
  } | undefined

  const currentModule = getModule(row!.module_slug) ?? ALL_MODULES[0]
  const previousModule = prevRow ? getModule(prevRow.module_slug) : null

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-6">

      {/* Module header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">Today&apos;s Module</p>
            <h1 className="text-xl font-bold text-gray-800">{currentModule.titleEn}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{currentModule.titleEs}</p>
          </div>
          <span className="text-3xl">{currentModule.icon === 'Hand' ? '👋' : currentModule.icon === 'Train' ? '🚇' : currentModule.icon === 'ShoppingCart' ? '🛒' : currentModule.icon === 'Users' ? '👨‍👩‍👧' : currentModule.icon === 'Shirt' ? '👕' : '💬'}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3">
          <span className="text-xs text-gray-500">Switch module:</span>
          <ModuleSelector currentSlug={currentModule.slug} />
        </div>
      </div>

      {/* Session flow */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
        <h2 className="font-semibold text-gray-700 mb-3">Session Flow</h2>
        <div className="space-y-2">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{step.label}</p>
                <p className="text-xs text-gray-400">{step.sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warm-up: previous module vocab */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
            Warm-Up Vocabulary
          </span>
        </h2>
        {previousModule ? (
          <>
            <p className="text-xs text-gray-500">From last session: <strong>{previousModule.titleEn}</strong></p>
            <TutorVocabList vocab={previousModule.vocab} />
          </>
        ) : (
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 text-center">
            No prior session — this is the first one!
          </div>
        )}
      </div>

      {/* Today's vocabulary */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
            Today&apos;s Vocabulary
          </span>
        </h2>
        <TutorVocabList vocab={currentModule.vocab} />
      </div>

      {/* Role-play scenario */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
            Role-Play Scenario
          </span>
        </h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-gray-700 leading-relaxed">{currentModule.teachingScenario}</p>
        </div>
      </div>

      {/* Homework */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">
          <span className="inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">4</span>
            Homework Assignment
          </span>
        </h2>
        <div className="bg-white rounded-xl border border-amber-100 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800">{currentModule.homeworkLabel}</p>
            <a
              href={currentModule.homeworkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-600 hover:text-amber-800 underline break-all"
            >
              {currentModule.homeworkUrl}
            </a>
            <p className="text-xs text-gray-400 mt-1">10–15 minutes · Share this link with students</p>
          </div>
          <HomeworkButton initialAssigned={row!.homework_assigned === 1} />
        </div>
      </div>

    </div>
  )
}
