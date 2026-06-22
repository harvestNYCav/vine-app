import { NextRequest, NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { getSession } from '@/lib/auth'
import { firstTrackPath, getStudentTracks, normalizeTracks, setStudentTracks } from '@/lib/tracks'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDb()
  const tracks = await getStudentTracks(db, session.userId)
  return NextResponse.json({ tracks })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tracks: rawTracks, studentId } = await req.json()
  if (typeof studentId === 'string' && studentId !== session.userId) {
    return NextResponse.json({ error: 'Students can only change their own tracks' }, { status: 403 })
  }

  const tracks = normalizeTracks(rawTracks)
  if (tracks.length === 0) {
    return NextResponse.json({ error: 'Choose at least one track' }, { status: 400 })
  }

  const db = await getDb()
  await setStudentTracks(db, session.userId, tracks)
  return NextResponse.json({ ok: true, nextPath: firstTrackPath(tracks) })
}
