import { notFound } from 'next/navigation'
import { getElaExamBySlug } from '@/content/ela-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { studentCanAccessElaExam } from '@/lib/ela-exam-access'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import ExamPracticeClient from './ExamPracticeClient'

export default async function ElaExamPracticePage({
  params,
}: {
  params: Promise<{ examSlug: string; sectionSlug: string }>
}) {
  const { examSlug, sectionSlug } = await params
  const exam = getElaExamBySlug(examSlug)
  const section = exam?.sections.find(item => item.slug === sectionSlug)
  if (!exam || !section || section.passageReferences.length === 0) notFound()

  const session = await getSession()
  if (!session || session.role !== 'student') notFound()
  const db = await getDb()
  const [tracks, settings] = await Promise.all([
    getStudentTracks(db, session.userId),
    getStudentSettings(db, session.userId),
  ])
  if (!studentCanAccessElaExam(tracks, settings, exam)) notFound()

  return <ExamPracticeClient exam={exam} section={section} />
}
