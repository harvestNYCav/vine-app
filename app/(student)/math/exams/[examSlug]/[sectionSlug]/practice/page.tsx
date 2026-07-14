import { notFound } from 'next/navigation'
import { getMathExamBySlug } from '@/content/math-exams'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentSettings } from '@/lib/student-settings'
import { getStudentTracks } from '@/lib/tracks'
import ExamPracticeClient from './ExamPracticeClient'

export default async function MathExamPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string; sectionSlug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const [{ examSlug, sectionSlug }, { lang }] = await Promise.all([params, searchParams])
  const exam = getMathExamBySlug(examSlug)
  const section = exam?.sections.find(item => item.slug === sectionSlug)
  if (!exam || !section) notFound()

  const session = await getSession()
  const db = await getDb()
  const [tracks, settings] = await Promise.all([
    getStudentTracks(db, session!.userId),
    getStudentSettings(db, session!.userId),
  ])
  if (!tracks.includes('math')) notFound()
  const isSpanish = settings.mathSpanishEnabled && lang === 'es'

  return <ExamPracticeClient exam={exam} section={section} isSpanish={isSpanish} />
}
