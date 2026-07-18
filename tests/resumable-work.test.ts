import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadDraft,
  mathAttemptTtlMs,
  nextUnansweredQuestionIndex,
  saveDraft,
  TIMED_MATH_ATTEMPT_TTL_MS,
  userDraftKey,
  WEEKEND_DRAFT_TTL_MS,
  type DraftStorage,
} from '../lib/resumable-work'
import { formatDueWordCount, formatReviewedWordCount, formatWordCount } from '../lib/study'
import { firstPracticePath } from '../lib/tracks'

class MemoryStorage implements DraftStorage {
  values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function isSlideDraft(value: unknown): value is { slideIndex: number } {
  return !!value && typeof value === 'object' && Number.isInteger((value as { slideIndex: number }).slideIndex)
}

test('draft keys isolate students sharing a device', () => {
  assert.notEqual(userDraftKey('student-a', 'review', 'intro'), userDraftKey('student-b', 'review', 'intro'))
})

test('valid drafts round-trip and stale drafts are removed', () => {
  const storage = new MemoryStorage()
  const key = userDraftKey('student-a', 'review', 'intro')
  saveDraft(storage, key, { slideIndex: 4 }, 1_000)

  assert.deepEqual(loadDraft(storage, key, isSlideDraft, 500, 1_400), { slideIndex: 4 })
  assert.equal(loadDraft(storage, key, isSlideDraft, 500, 1_501), null)
  assert.equal(storage.getItem(key), null)
})

test('corrupt drafts are discarded instead of breaking resume', () => {
  const storage = new MemoryStorage()
  const key = userDraftKey('student-a', 'worksheet', 'intro')
  storage.setItem(key, '{not-json')

  assert.equal(loadDraft(storage, key, isSlideDraft, 500, 1_000), null)
  assert.equal(storage.getItem(key), null)
})

test('released exams continue at the first unanswered question', () => {
  const questions = ['q1', 'q2', 'q3']
  assert.equal(nextUnansweredQuestionIndex(questions, [{ questionId: 'q1' }]), 1)
  assert.equal(nextUnansweredQuestionIndex(questions, [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]), -1)
})

test('diagnostic and count attempts span a weekend while timed drills stay short-lived', () => {
  assert.equal(mathAttemptTtlMs('diagnostic'), WEEKEND_DRAFT_TTL_MS)
  assert.equal(mathAttemptTtlMs('flat_25'), WEEKEND_DRAFT_TTL_MS)
  assert.equal(mathAttemptTtlMs('custom'), WEEKEND_DRAFT_TTL_MS)
  assert.equal(mathAttemptTtlMs('practice_5'), TIMED_MATH_ATTEMPT_TTL_MS)
})

test('due-word copy uses the right singular and plural forms', () => {
  assert.equal(formatWordCount(1), '1 word')
  assert.equal(formatWordCount(2), '2 words')
  assert.equal(formatDueWordCount(1), '1 word due')
  assert.equal(formatDueWordCount(2), '2 words due')
  assert.equal(formatReviewedWordCount(1), 'You reviewed 1 word today.')
  assert.equal(formatReviewedWordCount(2), 'You reviewed 2 words today.')
})

test('practice fallback stays in Practice for every student track', () => {
  assert.equal(firstPracticePath(['ela']), '/practice?mode=ela')
  assert.equal(firstPracticePath(['math']), '/practice?mode=math')
  assert.equal(firstPracticePath(['ela', 'esl']), '/practice?mode=esl')
})
