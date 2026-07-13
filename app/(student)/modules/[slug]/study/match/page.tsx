import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'
import MatchingGameClient from './MatchingGameClient'

export default async function MatchingGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()
  const taughtSlugs = await getTaughtModuleSlugsForStudent(db, session!.userId)
  if (!taughtSlugs.has(slug)) notFound()

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <MatchingGameClient mod={mod} />
    </div>
  )
}
