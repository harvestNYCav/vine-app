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

// The agenda section each kind of deck slide belongs to, so "where the tutor stopped" reads in the
// same terms as the agenda.
const SLIDE_SECTIONS: Record<string, string> = {
  title: 'Start',
  agenda: 'Start',
  vocab: 'Vocabulary',
  grammar: 'Grammar focus',
  pronunciation: 'Pronunciation, matching & copying',
  matching: 'Pronunciation, matching & copying',
  transcription: 'Pronunciation, matching & copying',
  classWorksheet: 'In-class worksheet',
  scenario: 'Role-play',
  listening: 'Listening & writing',
  practice: 'Guided practice',
  inPersonQuiz: 'In-person quiz',
  wrapup: 'Wrap-up',
}

export function slideSection(slideType: string): string {
  return SLIDE_SECTIONS[slideType] ?? slideType
}

export function totalAgendaMinutes(items: AgendaItem[]): number {
  return items.reduce((sum, item) => sum + item.minutes, 0)
}
