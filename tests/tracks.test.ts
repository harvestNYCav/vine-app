import test from 'node:test'
import assert from 'node:assert/strict'
import { firstAvailableMode, firstTrackPath } from '../lib/tracks'

test('a mode-less read-only page falls back to a track the student actually has', () => {
  assert.equal(firstAvailableMode(['math']), 'math')
  assert.equal(firstAvailableMode(['ela']), 'ela')
  assert.equal(firstAvailableMode(['ela', 'math']), 'ela')
  assert.equal(firstAvailableMode(['esl', 'math']), 'esl')
})

test('a student with no tracks has no mode to fall back to', () => {
  assert.equal(firstAvailableMode([]), null)
})

test('the fallback mode agrees with where a student would be sent', () => {
  assert.equal(firstTrackPath(['esl', 'math']), '/modules')
  assert.equal(firstAvailableMode(['esl', 'math']), 'esl')
  assert.equal(firstTrackPath(['ela', 'math']), '/modules?mode=ela')
  assert.equal(firstAvailableMode(['ela', 'math']), 'ela')
})
