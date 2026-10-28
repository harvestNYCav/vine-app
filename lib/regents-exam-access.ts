import type { Track } from '@/types'
import { regentsCourseSubject, type RegentsCourse } from './regents-courses'

export function studentCanAccessRegentsExam(
  tracks: readonly Track[],
  assignedCourses: readonly RegentsCourse[],
  exam: { course: RegentsCourse },
): boolean {
  return tracks.includes(regentsCourseSubject(exam.course))
    && assignedCourses.includes(exam.course)
}
