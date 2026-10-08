import type { Module } from '@/types'

export interface AgendaItem {
  label: string
  minutes: number
}

// Suggested pacing for the 2-hour Saturday session. Sections a module lacks are left out.
export function getLessonAgenda(mod: Module): AgendaItem[] {
  const items: AgendaItem[] = []
  if (mod.vocab.length > 0) items.push({ label: 'Vocabulary', minutes: 15 })
  if (mod.grammar?.length) items.push({ label: 'Grammar focus', minutes: 10 })
  if (mod.track === 'esl' && mod.vocab.length > 0) {
    items.push({ label: 'Pronunciation, matching & copying', minutes: 10 })
  }
  if (mod.classWorksheet?.length) items.push({ label: 'In-class worksheet', minutes: 15 })
  if (mod.teachingScenarios.length > 0) items.push({ label: 'Role-play', minutes: 25 })
  if (mod.listening?.length) items.push({ label: 'Listening & writing', minutes: 20 })
  if (mod.practiceActivities?.length) items.push({ label: 'Guided practice', minutes: 15 })
  if (mod.inPersonQuiz?.length) items.push({ label: 'In-person quiz', minutes: 10 })
  return items
}

export function totalAgendaMinutes(items: AgendaItem[]): number {
  return items.reduce((sum, item) => sum + item.minutes, 0)
}
