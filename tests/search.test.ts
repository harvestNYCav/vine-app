import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch } from '../lib/search'

test('an empty or blank query matches everything', () => {
  assert.equal(matchesSearch('', 'Ana Lopez'), true)
  assert.equal(matchesSearch('   ', 'Ana Lopez'), true)
})

test('matching ignores case and accents', () => {
  assert.equal(matchesSearch('JOSE', 'José Martínez'), true)
  assert.equal(matchesSearch('martínez', 'Jose Martinez'), true)
  assert.equal(matchesSearch('maria', 'Carlos'), false)
})

test('every word must appear, in any field and any order', () => {
  assert.equal(matchesSearch('ana lo', 'Ana Lopez'), true)
  assert.equal(matchesSearch('lopez ana', 'Ana Lopez'), true)
  assert.equal(matchesSearch('ana smith', 'Ana Lopez'), false)
  assert.equal(matchesSearch('familia', 'My Family', 'Mi familia'), true)
  assert.equal(matchesSearch('esl family', 'My Family', undefined, 'ESL'), true)
})
