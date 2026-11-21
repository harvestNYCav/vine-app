'use client'

import { Fragment, useState } from 'react'
import { SESSION_MINUTES, type DeckSession, type LessonFit, type ScoreRecord, type TaughtLesson } from '@/lib/admin-metrics'
import { flagClass, maybe, minutes, percent, rating } from './format'
import { lessonFlags } from './flags'
import { DeckTable, DetailBlock, LessonLog, ScoreTable } from './details'

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

const COLUMNS = 11

// Lessons in teaching order. Any row with data opens to show the classes, slide sessions, wrap-ups
// and scores its averages come from.
export default function LessonFitTable({ lessons, taught, decks, quizzes, homework }: {
  lessons: LessonFit[]
  taught: TaughtLesson[]
  decks: DeckSession[]
  quizzes: ScoreRecord[]
  homework: ScoreRecord[]
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (slug: string) => setOpen(previous => {
    const next = new Set(previous)
    if (next.has(slug)) next.delete(slug)
    else next.add(slug)
    return next
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
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
            const isTaught = lesson.classesTaught > 0
            const lessonTaught = taught.filter(item => item.slug === lesson.slug)
            const lessonDecks = decks.filter(item => item.slug === lesson.slug)
            const lessonQuizzes = quizzes.filter(item => item.slug === lesson.slug)
            const lessonHomework = homework.filter(item => item.slug === lesson.slug)
            const hasDetail = lessonTaught.length + lessonDecks.length + lessonQuizzes.length + lessonHomework.length > 0
            const isOpen = open.has(lesson.slug)
            const flags = lessonFlags(lesson)
            // Slides opened for a lesson nobody had scheduled.
            const unscheduled = lessonDecks.filter(deck => !deck.scheduled).length
            return (
              <Fragment key={lesson.slug}>
                <tr
                  className={`border-b border-slate-100 ${isTaught ? '' : 'text-slate-400'} ${hasDetail ? 'cursor-pointer hover:bg-slate-50' : ''} ${isOpen ? 'bg-slate-50' : ''}`}
                  onClick={hasDetail ? () => toggle(lesson.slug) : undefined}
                >
                  <td className="py-2 pr-2 tabular-nums text-slate-400">{lesson.position}</td>
                  <td className={`py-2 pr-3 font-medium ${isTaught ? 'text-slate-800' : 'text-slate-400'}`}>
                    {hasDetail ? (
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={event => { event.stopPropagation(); toggle(lesson.slug) }}
                        className="text-left hover:underline"
                      >
                        <span className="mr-1 inline-block w-3 text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                        {lesson.title}
                      </button>
                    ) : (
                      <span className="ml-4">{lesson.title}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                    {lesson.classesTaught}
                    {isTaught && <span className="text-xs text-slate-400"> · {lesson.studentsTaught} st.</span>}
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
                      {flags.map(flag => (
                        <span key={flag.label} title={flag.why} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass(flag.tone)}`}>
                          {flag.label}
                        </span>
                      ))}
                      {unscheduled > 0 && (
                        <span
                          title="Slides were opened on a day no student had this lesson scheduled: a preview, or taught without assigning it in Vine."
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass('muted')}`}
                        >
                          Slides opened, not scheduled
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td colSpan={COLUMNS} className="px-3 py-4 text-slate-700">
                      {flags.some(flag => flag.why) && (
                        <ul className="mb-3 list-disc pl-5 text-sm text-slate-700">
                          {flags.filter(flag => flag.why).map(flag => <li key={flag.label}><strong>{flag.label}:</strong> {flag.why}</li>)}
                        </ul>
                      )}
                      {lessonTaught.length > 0 && (
                        <DetailBlock title={`Taught to ${lessonTaught.length} ${lessonTaught.length === 1 ? 'student' : 'students'}`}>
                          <LessonLog lessons={lessonTaught} />
                        </DetailBlock>
                      )}
                      {lessonDecks.length > 0 && (
                        <DetailBlock title="Slides on screen">
                          <DeckTable decks={lessonDecks} showLesson={false} />
                        </DetailBlock>
                      )}
                      {lessonQuizzes.length > 0 && (
                        <DetailBlock title="Quiz scores">
                          <ScoreTable records={lessonQuizzes} what="quizzes" showLesson={false} />
                        </DetailBlock>
                      )}
                      {lessonHomework.length > 0 && (
                        <DetailBlock title="Homework scores">
                          <ScoreTable records={lessonHomework} what="homework" showLesson={false} />
                        </DetailBlock>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
