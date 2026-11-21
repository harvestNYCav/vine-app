import type { DeckSession, ExamRecord, ScoreRecord, TaughtLesson } from '@/lib/admin-metrics'
import { flagClass, formatDay, formatDayLong, minutes, percent, plural } from './format'

// The drill-down lists behind the Impact page's numbers. Plain components with no state, so both
// the server page and the client tables can render them.

export function Pill({ tone, children }: { tone: 'warn' | 'good' | 'muted'; children: React.ReactNode }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass(tone)}`}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>
}

export function Summary({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm text-slate-700">{children}</p>
}

// Names as chips, each with an optional detail ("2 days").
export function NameChips({ items, empty = 'Nobody.' }: { items: Array<{ key: string; name: string; meta?: string }>; empty?: string }) {
  if (items.length === 0) return <Empty>{empty}</Empty>
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(item => (
        <li key={item.key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800">
          {item.name}
          {item.meta && <span className="ml-1.5 text-xs text-slate-500">{item.meta}</span>}
        </li>
      ))}
    </ul>
  )
}

function Table({ head, children, minWidth = 560 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            {head.map(label => <th key={label} className="py-1.5 pr-3 font-semibold">{label}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const cell = 'py-1.5 pr-3 align-top text-slate-700'

// Lessons grouped into classes: one tutor teaching one lesson on one day, with the students in it.
// This is who was paired with whom.
export function ClassList({ lessons }: { lessons: TaughtLesson[] }) {
  if (lessons.length === 0) return <Empty>No lessons taught.</Empty>
  const classes = new Map<string, TaughtLesson[]>()
  for (const lesson of lessons) {
    const key = `${lesson.date}|${lesson.tutorId}|${lesson.slug}`
    classes.set(key, [...(classes.get(key) ?? []), lesson])
  }
  return (
    <Table head={['Date', 'Tutor', 'Lesson', 'Students']}>
      {[...classes.values()].map(group => {
        const first = group[0]
        return (
          <tr key={`${first.date}|${first.tutorId}|${first.slug}`} className="border-b border-slate-100 last:border-0">
            <td className={`${cell} whitespace-nowrap`}>{formatDayLong(first.date)}</td>
            <td className={`${cell} font-medium text-slate-800`}>{first.tutorName}</td>
            <td className={cell}>{first.title}</td>
            <td className={cell}>{group.map(lesson => lesson.studentName).join(', ')}</td>
          </tr>
        )
      })}
    </Table>
  )
}

export type LessonCheck = 'deck' | 'wrap' | 'handoff' | 'homework' | 'done'

function deckCell(lesson: TaughtLesson) {
  if (lesson.deck === 'untracked') return <span className="text-slate-400">Before tracking</span>
  if (lesson.deck === 'unused') return <Pill tone="warn">Not opened</Pill>
  return (
    <span>
      <span className="text-green-700">✓ Opened</span>
      <span className="text-xs text-slate-500">
        {' '}· {minutes(lesson.deckMinutes ?? 0)} · {lesson.deckOpenedBy.join(', ')}
      </span>
    </span>
  )
}

function wrapCell(lesson: TaughtLesson) {
  if (lesson.wrapUp === 'untracked') return <span className="text-slate-400">Before tracking</span>
  if (lesson.wrapUp === 'missing') return <Pill tone="warn">Missing</Pill>
  return (
    <span title={lesson.note ?? undefined}>
      <span className="text-green-700">✓ {lesson.finished ? 'Finished' : `Stopped at ${lesson.stoppedAt ?? '?'}`}</span>
      <span className="text-xs text-slate-500"> · {lesson.rating}/5</span>
      {lesson.note && <span className="block text-xs text-slate-500">“{lesson.note}”</span>}
      {lesson.handoffNote && <span className="block text-xs text-amber-800">For next time: “{lesson.handoffNote}”</span>}
    </span>
  )
}

function homeworkCell(lesson: TaughtLesson) {
  if (!lesson.homeworkAssigned) return <span className="text-slate-400">Not assigned</span>
  if (lesson.homeworkDoneOn) return <span className="text-green-700">✓ Done {formatDay(lesson.homeworkDoneOn)}</span>
  return <span>Assigned · <span className="text-amber-800">not done yet</span></span>
}

const CHECKS: Record<LessonCheck, { applies: (l: TaughtLesson) => boolean; ok: (l: TaughtLesson) => boolean; okLabel: string; missLabel: string }> = {
  deck: { applies: l => l.deck !== 'untracked', ok: l => l.deck === 'used', okLabel: 'had the slides opened', missLabel: 'Slides not opened' },
  wrap: { applies: l => l.wrapUp !== 'untracked', ok: l => l.wrapUp === 'filed', okLabel: 'had a wrap-up filed', missLabel: 'No wrap-up' },
  handoff: { applies: l => l.handoff !== 'untracked', ok: l => l.handoff === 'left', okLabel: 'left a note for the next tutor', missLabel: 'No hand-off' },
  homework: { applies: () => true, ok: l => l.homeworkAssigned, okLabel: 'had homework assigned', missLabel: 'No homework assigned' },
  done: { applies: l => l.homeworkAssigned, ok: l => l.homeworkDoneOn !== null, okLabel: 'had the homework finished', missLabel: 'Homework not done' },
}

// Every lesson behind a rate, misses first, so "93% taught with the slides" can be checked line by
// line. `check` picks the rate; lessons it doesn't apply to (before tracking began) are left out.
export function LessonLog({ lessons, check }: { lessons: TaughtLesson[]; check?: LessonCheck }) {
  const rule = check ? CHECKS[check] : null
  const shown = rule ? lessons.filter(rule.applies) : lessons
  if (shown.length === 0) return <Empty>No lessons to show.</Empty>
  const sorted = rule ? [...shown].sort((a, b) => Number(rule.ok(a)) - Number(rule.ok(b))) : shown
  const ok = rule ? shown.filter(rule.ok).length : 0
  const misses = rule ? shown.filter(lesson => !rule.ok(lesson)) : []
  const left = lessons.length - shown.length
  return (
    <div>
      {rule && (
        <Summary>
          <strong>{ok} of {plural(shown.length, 'lesson')}</strong> {rule.okLabel}.
          {misses.length > 0 && <> {rule.missLabel}: {misses.map(l => `${l.studentName} (${l.title}, ${l.tutorName})`).join('; ')}.</>}
          {left > 0 && <span className="text-slate-500"> {plural(left, 'lesson')} from before tracking began {left === 1 ? "isn't" : "aren't"} counted.</span>}
        </Summary>
      )}
      <Table head={['Date', 'Student', 'Lesson', 'Tutor', 'Slides', 'Wrap-up', 'Homework']} minWidth={860}>
        {sorted.map(lesson => (
          <tr key={lesson.sessionId} className={`border-b border-slate-100 last:border-0 ${rule && !rule.ok(lesson) ? 'bg-amber-50/60' : ''}`}>
            <td className={`${cell} whitespace-nowrap`}>{formatDay(lesson.date)}</td>
            <td className={`${cell} font-medium text-slate-800`}>{lesson.studentName}</td>
            <td className={cell}>{lesson.title}</td>
            <td className={cell}>{lesson.tutorName}</td>
            <td className={cell}>{deckCell(lesson)}</td>
            <td className={cell}>{wrapCell(lesson)}</td>
            <td className={cell}>{homeworkCell(lesson)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

// Quiz or homework scores, lowest first so the students who struggled are on top.
export function ScoreTable({ records, what, showLesson = true }: { records: ScoreRecord[]; what: string; showLesson?: boolean }) {
  if (records.length === 0) return <Empty>No {what} submitted.</Empty>
  const sorted = [...records].sort((a, b) => a.score - b.score || a.studentName.localeCompare(b.studentName))
  return (
    <Table head={['Student', ...(showLesson ? ['Lesson'] : []), 'Submitted', 'Score']} minWidth={showLesson ? 480 : 320}>
      {sorted.map(record => (
        <tr key={`${record.studentId}:${record.slug}`} className="border-b border-slate-100 last:border-0">
          <td className={`${cell} font-medium text-slate-800`}>{record.studentName}</td>
          {showLesson && <td className={cell}>{record.title}</td>}
          <td className={`${cell} whitespace-nowrap`}>{formatDay(record.date)}</td>
          <td className={`${cell} tabular-nums ${record.score < 0.6 ? 'font-semibold text-amber-800' : ''}`}>{percent(record.score)}</td>
        </tr>
      ))}
    </Table>
  )
}

export function ExamTable({ records }: { records: ExamRecord[] }) {
  if (records.length === 0) return <Empty>No exam sections finished.</Empty>
  const sorted = [...records].sort((a, b) => a.score - b.score || a.studentName.localeCompare(b.studentName))
  return (
    <Table head={['Student', 'Exam', 'Section', 'Finished', 'Score']}>
      {sorted.map((record, index) => (
        <tr key={`${record.studentId}:${record.examId}:${record.section}:${index}`} className="border-b border-slate-100 last:border-0">
          <td className={`${cell} font-medium text-slate-800`}>{record.studentName}</td>
          <td className={cell}>{record.subject} · {record.examId}</td>
          <td className={cell}>{record.section}</td>
          <td className={`${cell} whitespace-nowrap`}>{formatDay(record.date)}</td>
          <td className={`${cell} tabular-nums ${record.score < 0.6 ? 'font-semibold text-amber-800' : ''}`}>{percent(record.score)}</td>
        </tr>
      ))}
    </Table>
  )
}

// Each time a tutor had a lesson's slides up, and how far they got.
export function DeckTable({ decks, showLesson = true }: { decks: DeckSession[]; showLesson?: boolean }) {
  if (decks.length === 0) return <Empty>No slide decks opened.</Empty>
  return (
    <Table head={['Date', 'Tutor', ...(showLesson ? ['Lesson'] : []), 'On screen', 'Slides reached', '']}>
      {decks.map(deck => (
        <tr key={`${deck.tutorId}:${deck.date}:${deck.slug}`} className="border-b border-slate-100 last:border-0">
          <td className={`${cell} whitespace-nowrap`}>{formatDay(deck.date)}</td>
          <td className={`${cell} font-medium text-slate-800`}>{deck.tutorName}</td>
          {showLesson && <td className={cell}>{deck.title}</td>}
          <td className={`${cell} tabular-nums`}>{minutes(deck.minutes)}</td>
          <td className={`${cell} tabular-nums`}>{deck.reach === null ? '—' : percent(deck.reach)}</td>
          <td className={cell}>
            {!deck.scheduled && (
              <span title="No student had this lesson scheduled that day: a preview, or a lesson taught without assigning it in Vine.">
                <Pill tone="muted">Not scheduled</Pill>
              </span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  )
}

export function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  )
}
