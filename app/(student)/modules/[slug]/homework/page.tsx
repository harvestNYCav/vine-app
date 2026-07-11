import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import WorksheetClient from './WorksheetClient'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import { getTaughtModuleSlugsForStudent } from '@/lib/scheduling'

export default async function HomeworkPage({ params }: { params: Promise<{ slug: string }> }) {
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
      <WorksheetClient mod={mod} />
    </div>
  )
}
