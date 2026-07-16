import type { ElaExamDefinition } from '@/content/ela-exams/types'
import type { StudentSettings } from './student-settings'
import type { Track } from '@/types'

export function studentCanAccessElaExam(
  tracks: readonly Track[],
  settings: Pick<StudentSettings, 'gradeLevel'>,
  exam: ElaExamDefinition,
) {
  return tracks.includes('ela') && settings.gradeLevel === exam.grade
}
