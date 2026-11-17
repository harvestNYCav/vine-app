import { SESSION_MINUTES, type LessonFit } from '@/lib/admin-metrics'
import { flagClass, maybe, minutes, percent, rating } from './format'

// Below these sample sizes a flag would be noise.
const MIN_CLASSES = 2
const MIN_SCORES = 3
const SHORT_MINUTES = 60
const UNFINISHED_RATE = 0.5
const HARD_QUIZ = 0.6
const EASY_QUIZ = 0.95

export function lessonFlags(lesson: LessonFit): Array<{ label: string; tone: 'warn' | 'muted' }> {
  if (lesson.classesTaught === 0) return [{ label: 'Not taught', tone: 'muted' }]
  const flags: Array<{ label: string; tone: 'warn' | 'muted' }> = []
  if (lesson.classesTaught >= MIN_CLASSES && lesson.averageDeckMinutes !== null && lesson.averageDeckMinutes < SHORT_MINUTES) {
    flags.push({ label: 'Runs short', tone: 'warn' })
  }
  if (lesson.wrapUps >= MIN_CLASSES && lesson.finishedRate !== null && lesson.finishedRate < UNFINISHED_RATE) {
    flags.push({ label: 'Often unfinished', tone: 'warn' })
  }
  if (lesson.quizCount >= MIN_SCORES && lesson.quizAverage !== null && lesson.quizAverage < HARD_QUIZ) {
    flags.push({ label: 'Quiz looks hard', tone: 'warn' })
  }
  if (lesson.quizCount >= MIN_SCORES && lesson.quizAverage !== null && lesson.quizAverage >= EASY_QUIZ) {
    flags.push({ label: 'Quiz may be easy', tone: 'warn' })
  }
  return flags
}

function SlideTime({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>
  const share = Math.min(1, value / SESSION_MINUTES)
  return (
    <span className="flex items-center justify-end gap-2 whitespace-nowrap">
      <span className="tabular-nums">{minutes(value)}</span>
      <span
        className="relative inline-block h-1.5 w-14 overflow-hidden rounded-full bg-blue-100"
        aria-label={`${Math.round(share * 100)}% of a ${SESSION_MINUTES}-minute session`}
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-[#2a78d6]" style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  )
}

export default function LessonFitTable({ lessons }: { lessons: LessonFit[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-3 font-semibold">Lesson</th>
            <th className="px-2 py-2 text-right font-semibold">Classes</th>
            <th className="px-2 py-2 text-right font-semibold">Slide time</th>
            <th className="px-2 py-2 text-right font-semibold">Slides reached</th>
            <th className="px-2 py-2 text-right font-semibold">Finished</th>
            <th className="px-2 py-2 font-semibold">Usually stopped at</th>
            <th className="px-2 py-2 text-right font-semibold">Quiz avg</th>
            <th className="px-2 py-2 text-right font-semibold">Homework avg</th>
            <th className="px-2 py-2 text-right font-semibold">Rating</th>
            <th className="py-2 pl-2 font-semibold">Flags</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map(lesson => {
            const taught = lesson.classesTaught > 0
            return (
              <tr key={lesson.slug} className={`border-b border-slate-100 last:border-0 ${taught ? '' : 'text-slate-400'}`}>
                <td className="py-2 pr-2 tabular-nums text-slate-400">{lesson.position}</td>
                <td className={`py-2 pr-3 font-medium ${taught ? 'text-slate-800' : 'text-slate-400'}`}>{lesson.title}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {lesson.classesTaught}
                  {taught && <span className="text-xs text-slate-400"> · {lesson.studentsTaught} st.</span>}
                </td>
                <td className="px-2 py-2 text-right"><SlideTime value={lesson.averageDeckMinutes} /></td>
                <td className="px-2 py-2 text-right tabular-nums">{maybe(lesson.averageDeckReach, percent)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {maybe(lesson.finishedRate, percent)}
                  {lesson.wrapUps > 0 && <span className="text-xs text-slate-400"> of {lesson.wrapUps}</span>}
                </td>
                <td className="max-w-[10rem] truncate px-2 py-2 text-slate-600" title={lesson.commonStoppingPoint ?? undefined}>
                  {lesson.commonStoppingPoint ?? '—'}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{maybe(lesson.quizAverage, percent)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{maybe(lesson.homeworkAverage, percent)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{maybe(lesson.averageRating, rating)}</td>
                <td className="py-2 pl-2">
                  <div className="flex flex-wrap gap-1">
                    {lessonFlags(lesson).map(flag => (
                      <span key={flag.label} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass(flag.tone)}`}>
                        {flag.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
