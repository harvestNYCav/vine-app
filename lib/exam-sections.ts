import { getElaExamById, getElaExamsForGrade } from '@/content/ela-exams'
import { getMathExamById, getMathExamsForGrade } from '@/content/math-exams'
import {
  getRegentsExamById,
  getRegentsSection,
  getRegentsSectionQuestions,
  regentsAdministrationLabel,
  REGENTS_COURSE_LABELS,
} from '@/content/regents'
import type { RegentsCourse, RegentsExam } from '@/content/regents/types'
import type { GradeLevel } from '@/lib/grade-levels'
import type { ExamSectionRef } from '@/lib/exam-assignments'
import { regentsCourseSubject } from '@/lib/regents-courses'
import { studentCanAccessRegentsExam } from '@/lib/regents-exam-access'
import type { Track } from '@/types'

export interface ExamSectionInfo extends ExamSectionRef {
  // null for Regents sections, which belong to a course rather than a grade.
  grade: GradeLevel | null
  year: number
  // "2026" for Grade 3–8 exams; "June 2026" for Regents, which are given several times a year.
  yearLabel: string
  emoji: string
  title: string
  // Math sections have Spanish titles; used when the student is in Spanish mode.
  titleEs?: string
  supportsSpanish: boolean
  subjectLabel: string
  href: string
  // null where tutors have no preview page yet (Regents).
  tutorHref: string | null
}

// What decides whether a student can be given a section.
export interface ExamSectionAccess {
  tracks: readonly Track[]
  gradeLevel: GradeLevel | null
  regentsCourses: readonly RegentsCourse[]
}

// Looks up an assigned section in the exam catalogs. Returns null for a section that no longer
// exists (e.g. content was regenerated), so callers can skip it.
export function describeExamSection(ref: ExamSectionRef): ExamSectionInfo | null {
  const regentsExam = getRegentsExamById(ref.examId)
  if (regentsExam) return describeRegentsSection(ref, regentsExam)

  if (ref.subject === 'math') {
    const exam = getMathExamById(ref.examId)
    const section = exam?.sections.find(item => item.slug === ref.sectionSlug)
    if (!exam || !section) return null
    return {
      ...ref,
      grade: exam.grade,
      year: exam.year,
      yearLabel: String(exam.year),
      emoji: section.emoji,
      title: section.title.en,
      titleEs: section.title.es,
      supportsSpanish: exam.supportedLanguages.includes('es'),
      subjectLabel: 'Math',
      href: `/math/exams/${exam.slug}/${section.slug}`,
      tutorHref: `/tutor/exams/math/${exam.slug}/${section.slug}`,
    }
  }
  const exam = getElaExamById(ref.examId)
  const section = exam?.sections.find(item => item.slug === ref.sectionSlug)
  if (!exam || !section) return null
  return {
    ...ref,
    grade: exam.grade,
    year: exam.year,
    yearLabel: String(exam.year),
    emoji: section.emoji,
    title: section.title,
    supportsSpanish: false,
    subjectLabel: 'ELA',
    href: `/ela/exams/${exam.slug}/${section.slug}`,
    tutorHref: `/tutor/exams/ela/${exam.slug}/${section.slug}`,
  }
}

function describeRegentsSection(ref: ExamSectionRef, exam: RegentsExam): ExamSectionInfo | null {
  const section = getRegentsSection(exam, ref.sectionSlug)
  if (!section || regentsCourseSubject(exam.course) !== ref.subject) return null
  return {
    ...ref,
    grade: null,
    year: exam.year,
    yearLabel: regentsAdministrationLabel(exam),
    emoji: exam.course === 'english' ? '📖' : '📐',
    title: section.title,
    supportsSpanish: false,
    subjectLabel: `${REGENTS_COURSE_LABELS[exam.course]} Regents`,
    href: `/regents/${exam.course}/${exam.slug}/${section.slug}`,
    tutorHref: null,
  }
}

function examSectionIsForGrade(ref: ExamSectionRef, grade: GradeLevel | null) {
  const exams = ref.subject === 'math' ? getMathExamsForGrade(grade) : getElaExamsForGrade(grade)
  return exams.some(exam => exam.id === ref.examId && exam.sections.some(section => section.slug === ref.sectionSlug))
}

// Whether a tutor may assign this section to the student, and whether the student's "assigned"
// list shows it: a Grade 3–8 section for the student's grade, or a Regents section with ready
// questions in one of the student's Regents courses. Either way the student needs the track.
export function examSectionIsAvailable(ref: ExamSectionRef, access: ExamSectionAccess): boolean {
  if (!access.tracks.includes(ref.subject)) return false
  const regentsExam = getRegentsExamById(ref.examId)
  if (!regentsExam) return examSectionIsForGrade(ref, access.gradeLevel)

  const section = getRegentsSection(regentsExam, ref.sectionSlug)
  return section !== null
    && regentsCourseSubject(regentsExam.course) === ref.subject
    && studentCanAccessRegentsExam(access.tracks, access.regentsCourses, regentsExam)
    && getRegentsSectionQuestions(regentsExam, section).length > 0
}
