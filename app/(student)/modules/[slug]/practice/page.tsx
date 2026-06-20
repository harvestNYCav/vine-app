import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import QuizClient from './QuizClient'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()
  const session = await getSession()
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)
  if (!tracks.includes(mod.track)) notFound()

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <QuizClient mod={mod} />
    </div>
  )
}
