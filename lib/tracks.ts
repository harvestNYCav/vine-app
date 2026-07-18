import type { Client } from '@libsql/client'
import type { Module, Track } from '@/types'

export const TRACKS: Array<{
  id: Track
  label: string
  shortLabel: string
  description: string
}> = [
  {
    id: 'ela',
    label: 'ELA',
    shortLabel: 'ELA',
    description: 'Grade-school English reading, vocabulary, and grammar.',
  },
  {
    id: 'esl',
    label: 'ESL',
    shortLabel: 'ESL',
    description: 'Everyday English for adult learners.',
  },
  {
    id: 'math',
    label: 'Math',
    shortLabel: 'Math',
    description: 'Arithmetic practice and New York State standards-based lessons.',
  },
]

const TRACK_SET = new Set<Track>(TRACKS.map(t => t.id))

export function normalizeTracks(value: unknown): Track[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((track): track is Track => TRACK_SET.has(track as Track)))]
}

export async function getStudentTracks(db: Client, userId: string): Promise<Track[]> {
  const result = await db.execute({
    sql: 'SELECT track FROM user_tracks WHERE user_id = ? ORDER BY track',
    args: [userId],
  })
  return normalizeTracks(result.rows.map(row => row.track))
}

export async function setStudentTracks(db: Client, userId: string, tracks: Track[]): Promise<void> {
  const now = Date.now()
  await db.batch([
    { sql: 'DELETE FROM user_tracks WHERE user_id = ?', args: [userId] },
    ...tracks.map(track => ({
      sql: 'INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, ?, ?)',
      args: [userId, track, now],
    })),
  ], 'write')
}

export function firstTrackPath(tracks: Track[]): string {
  if (tracks.includes('esl')) return '/modules'
  if (tracks.includes('ela')) return '/modules?mode=ela'
  if (tracks.includes('math')) return '/practice?mode=math'
  return '/tracks'
}

export function firstPracticePath(tracks: Track[]): string {
  if (tracks.includes('esl')) return '/practice?mode=esl'
  if (tracks.includes('ela')) return '/practice?mode=ela'
  if (tracks.includes('math')) return '/practice?mode=math'
  return '/tracks'
}

export function filterModulesByTracks(modules: Module[], tracks: Track[]): Module[] {
  return modules.filter(mod => tracks.includes(mod.track))
}

export function moduleTrackLabel(track: Module['track']): string {
  return track === 'ela' ? 'ELA' : 'ESL'
}
