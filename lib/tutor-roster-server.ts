import 'server-only'

import { cookies } from 'next/headers'
import { normalizeTutorRosterScope, tutorRosterScopeCookieName } from './tutor-roster'

export async function getTutorRosterScope(tutorId: string) {
  const cookieStore = await cookies()
  return normalizeTutorRosterScope(cookieStore.get(tutorRosterScopeCookieName(tutorId))?.value)
}
