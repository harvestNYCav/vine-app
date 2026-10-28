import { notFound } from 'next/navigation'
import {
  getRegentsExamBySlug,
  getRegentsSection,
  getRegentsSectionQuestions,
  isRegentsCourse,
} from '@/content/regents'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentRegentsCourses } from '@/lib/regents-courses'
import { studentCanAccessRegentsExam } from '@/lib/regents-exam-access'
import { getStudentTracks } from '@/lib/tracks'
import RegentsPracticeClient from './RegentsPracticeClient'

export default async function RegentsPracticePage({
  params,
}: {
  params: Promise<{ course: string; examSlug: string; sectionSlug: string }>
}) {
  const { course, examSlug, sectionSlug } = await params
  if (!isRegentsCourse(course)) notFound()
  const exam = getRegentsExamBySlug(course, examSlug)
  if (!exam) notFound()
  const section = getRegentsSection(exam, sectionSlug)
  if (!section || !getRegentsSectionQuestions(exam, section).length) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [assignedCourses, tracks] = await Promise.all([
    getStudentRegentsCourses(db, session.userId),
    getStudentTracks(db, session.userId),
  ])
  if (!studentCanAccessRegentsExam(tracks, assignedCourses, exam)) notFound()

  return (
    <RegentsPracticeClient
      exam={{
        id: exam.id,
        slug: exam.slug,
        course: exam.course,
        administration: exam.administration,
        year: exam.year,
        sourceUrl: exam.sourceUrl,
        answerKeyUrl: exam.answerKeyUrl,
      }}
      section={{ slug: section.slug, title: section.title, passage: section.passage }}
    />
  )
}
