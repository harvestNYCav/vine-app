export interface DraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type DraftEnvelope = {
  version: 1
  updatedAt: number
  data: unknown
}

export const WEEKEND_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const LONG_FORM_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const TIMED_MATH_ATTEMPT_TTL_MS = 30 * 60 * 1000

export function userDraftKey(userId: string, flow: string, resource = ''): string {
  return ['vine', 'draft', encodeURIComponent(userId), encodeURIComponent(flow), encodeURIComponent(resource)].join(':')
}

export function saveDraft<T>(storage: DraftStorage, key: string, data: T, now = Date.now()): void {
  const envelope: DraftEnvelope = { version: 1, updatedAt: now, data }
  storage.setItem(key, JSON.stringify(envelope))
}

export function clearDraft(storage: DraftStorage, key: string): void {
  storage.removeItem(key)
}

export function loadDraft<T>(
  storage: DraftStorage,
  key: string,
  isValid: (value: unknown) => value is T,
  maxAgeMs: number,
  now = Date.now(),
): T | null {
  const raw = storage.getItem(key)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope>
    const validEnvelope = parsed.version === 1
      && typeof parsed.updatedAt === 'number'
      && Number.isFinite(parsed.updatedAt)
      && parsed.updatedAt <= now
      && now - parsed.updatedAt <= maxAgeMs
    if (validEnvelope && isValid(parsed.data)) return parsed.data
  } catch {
    // Corrupt or stale drafts should never strand the user on a loading screen.
  }

  storage.removeItem(key)
  return null
}

export function nextUnansweredQuestionIndex(
  questionIds: string[],
  responses: Array<{ questionId: string }>,
): number {
  const answered = new Set(responses.map(response => response.questionId))
  return questionIds.findIndex(questionId => !answered.has(questionId))
}

export function mathAttemptTtlMs(sessionType: string): number {
  return sessionType === 'practice_5' || sessionType === 'practice_10'
    ? TIMED_MATH_ATTEMPT_TTL_MS
    : WEEKEND_DRAFT_TTL_MS
}
