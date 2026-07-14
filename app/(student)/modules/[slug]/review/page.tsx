import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'
import ReviewSlidesClient from './ReviewSlidesClient'

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()

  const taughtSlugs = await getTaughtModuleSlugsForStudent(db, session!.userId)
  if (!taughtSlugs.has(slug)) notFound()

  return <ReviewSlidesClient mod={mod} />
}
