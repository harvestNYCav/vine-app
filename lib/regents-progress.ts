import { getRegentsExamsForCourse, getRegentsSectionQuestions } from '@/content/regents'
import type { RegentsCourse, RegentsExam } from '@/content/regents/types'
import type { Track } from '@/types'
import type { HighSchoolGradeLevel } from './grade-levels'
import { regentsCourseSubject } from './regents-courses'

/** Only assigned, published sections may appear in a student's Regents progress. */
export function assignedRegentsSectionKeys(
  courses: readonly RegentsCourse[],
  tracks: readonly Track[],
  highSchoolGradeLevel: HighSchoolGradeLevel | null,
  subject: 'math' | 'ela',
  examsForCourse: (course: RegentsCourse) => readonly RegentsExam[] = getRegentsExamsForCourse,
): Set<string> {
  if (highSchoolGradeLevel === null || !tracks.includes(subject)) return new Set()

  return new Set(courses
    .filter(course => regentsCourseSubject(course) === subject)
    .flatMap(course => examsForCourse(course).flatMap(exam =>
      exam.sections.filter(section => getRegentsSectionQuestions(exam, section).length > 0)
        .map(section => `${exam.id}:${section.slug}`)
    )))
}
