import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import TeachingChat from './TeachingChat'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'

export default async function TeachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()
  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()

  return <TeachingChat mod={mod} />
}
