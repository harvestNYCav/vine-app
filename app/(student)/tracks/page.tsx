import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import getDb from '@/lib/db'
import { getStudentTracks } from '@/lib/tracks'
import TrackSelectionClient from './TrackSelectionClient'

export default async function TracksPage() {
  const session = await getSession()
  if (session?.role === 'parent') redirect('/family')
  const db = await getDb()
  const tracks = await getStudentTracks(db, session!.userId)

  return <TrackSelectionClient initialTracks={tracks} />
}
