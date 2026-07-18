import { ALL_MODULES } from '@/content/modules'
import Link from 'next/link'
import { formatWordCount } from '@/lib/study'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
  BookOpen: '📚', Pencil: '✏️',
  Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
  MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
  Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
}

export default function LessonsLibraryPage() {
  const esl = ALL_MODULES.filter(mod => mod.track === 'esl')
  const ela = ALL_MODULES.filter(mod => mod.track === 'ela')

  const groups = [
    { label: 'ESL', modules: esl },
    { label: 'ELA', modules: ela },
  ]

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tutor" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <h1 className="text-xl font-bold text-gray-800">Lesson Library</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Browse and preview any lesson before assigning it to a session.</p>

      {groups.map(group => (
        <div key={group.label} className="mb-6">
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">{group.label}</h2>
          <div className="space-y-2">
            {group.modules.map((mod, i) => (
              <Link key={mod.slug} href={`/tutor/lessons/${mod.slug}`}>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl flex-shrink-0">
                    {MODULE_EMOJIS[mod.icon] ?? '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{i + 1}. {mod.titleEn}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {mod.track === 'esl' && `${mod.titleEs} · `}{formatWordCount(mod.vocab.length)}
                    </p>
                  </div>
                  <span className="text-gray-300 text-lg flex-shrink-0">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
