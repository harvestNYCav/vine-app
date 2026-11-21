import { SESSION_MINUTES, type LessonFit, type StudentProgress } from '@/lib/admin-metrics'

// Plain rules shared by the server page and the client tables.

const LOW_QUIZ = 0.6

// `singleWeek` lowers the bar for "no practice at home": one lesson in a week with no practice on
// any other day is already worth a look.
export function studentFlags(student: StudentProgress, singleWeek: boolean): string[] {
  const flags: string[] = []
  if (student.quizAverage !== null && student.quizAverage < LOW_QUIZ) flags.push('Low quiz scores')
  // Fewer than a third of assigned homework done.
  if (student.homeworkAssigned >= 2 && student.homeworkDone * 3 < student.homeworkAssigned) flags.push('Skipping homework')
  if (student.lessonsAttended >= (singleWeek ? 1 : 2) && student.homePracticeDays === 0) flags.push('No practice at home')
  if (student.placementDue) flags.push('Not placed')
  return flags
}

// Below these sample sizes a flag would be noise.
const MIN_CLASSES = 2
const MIN_SCORES = 3
const SHORT_MINUTES = 60
const UNFINISHED_RATE = 0.5
const HARD_QUIZ = 0.6
const EASY_QUIZ = 0.95

export interface LessonFlag {
  label: string
  tone: 'warn' | 'muted'
  why?: string
}

export function lessonFlags(lesson: LessonFit): LessonFlag[] {
  if (lesson.classesTaught === 0) return [{ label: 'Not taught', tone: 'muted' }]
  const flags: LessonFlag[] = []
  if (lesson.classesTaught >= MIN_CLASSES && lesson.averageDeckMinutes !== null && lesson.averageDeckMinutes < SHORT_MINUTES) {
    flags.push({ label: 'Runs short', tone: 'warn', why: `Slides on screen ${Math.round(lesson.averageDeckMinutes)} of ${SESSION_MINUTES} min on average` })
  }
  if (lesson.wrapUps >= MIN_CLASSES && lesson.finishedRate !== null && lesson.finishedRate < UNFINISHED_RATE) {
    flags.push({ label: 'Often unfinished', tone: 'warn', why: `Finished in ${Math.round(lesson.finishedRate * lesson.wrapUps)} of ${lesson.wrapUps} wrap-ups` })
  }
  if (lesson.quizCount >= MIN_SCORES && lesson.quizAverage !== null && lesson.quizAverage < HARD_QUIZ) {
    flags.push({ label: 'Quiz looks hard', tone: 'warn', why: `Quiz average ${Math.round(lesson.quizAverage * 100)}% over ${lesson.quizCount} scores` })
  }
  if (lesson.quizCount >= MIN_SCORES && lesson.quizAverage !== null && lesson.quizAverage >= EASY_QUIZ) {
    flags.push({ label: 'Quiz may be easy', tone: 'warn', why: `Quiz average ${Math.round(lesson.quizAverage * 100)}% over ${lesson.quizCount} scores` })
  }
  return flags
}
