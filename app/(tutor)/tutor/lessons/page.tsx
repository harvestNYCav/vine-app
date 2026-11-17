import { ALL_MODULES } from '@/content/modules'
import Link from 'next/link'
import { formatWordCount } from '@/lib/study'
import LessonLibraryGrid from './LessonLibraryGrid'

const MODULE_EMOJIS: Record<string, string> = {
  Hand: '👋', Train: '🚇', ShoppingCart: '🛒', Users: '👨‍👩‍👧', Shirt: '👕', MessageSquare: '💬',
  BookOpen: '📚', Pencil: '✏️',
  Smile: '😊', Tag: '🏷️', Clock: '🕐', Repeat: '🔁', PersonStanding: '🧍', Package: '📦',
  MousePointer2: '👉', Heart: '❤️', XCircle: '🚫', HelpCircle: '❓', Key: '🔑', Home: '🏠',
  Calendar: '📅', Utensils: '🍽️', HeartPulse: '🚑',
}

export default function LessonsLibraryPage() {
  // ELA practice now comes from the released NYSED exam lessons linked above, so the library lists ESL only.
  const lessons = ALL_MODULES.filter(mod => mod.track === 'esl').map((mod, i) => ({
    slug: mod.slug,
    number: i + 1,
    emoji: MODULE_EMOJIS[mod.icon] ?? '💬',
    title: mod.titleEn,
    subtitle: mod.titleEs,
    wordCount: formatWordCount(mod.vocab.length),
  }))

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tutor" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
        <h1 className="text-xl font-bold text-gray-800">Lesson Library</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Browse and preview any lesson before assigning it to a session.</p>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-bold text-gray-800">Grade 3–8 exam lessons</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          Preview released questions, reading passages, and answer explanations by grade and year.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/tutor/exams?subject=ela" className="rounded-xl border border-purple-100 bg-white px-3 py-3 text-center text-sm font-semibold text-purple-800 hover:bg-purple-50">
            ELA questions →
          </Link>
          <Link href="/tutor/exams?subject=math" className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-center text-sm font-semibold text-blue-800 hover:bg-blue-50">
            Math questions →
          </Link>
        </div>
      </section>

      <LessonLibraryGrid lessons={lessons} />
    </div>
  )
}
