import assert from 'node:assert/strict'
import test from 'node:test'
import type { Module } from '../types'
import { summarizeLessonProgressForTracks } from '../lib/lesson-progress'

const modules = [
  { slug: 'esl-one', track: 'esl' },
  { slug: 'esl-two', track: 'esl' },
  { slug: 'ela-one', track: 'ela' },
] as Module[]

test('lesson summaries include only modules in the student current tracks', () => {
  const summary = summarizeLessonProgressForTracks(modules, ['esl'], [
    { module_slug: 'esl-one', vocab_viewed_at: 100, homework_completed_at: 200 },
    { module_slug: 'ela-one', vocab_viewed_at: 100, homework_completed_at: 200 },
    { module_slug: 'removed-module', vocab_viewed_at: 100, homework_completed_at: 200 },
  ])

  assert.deepEqual(summary, {
    totalLessons: 2,
    completedLessons: 1,
    reviewedLessons: 1,
  })
})

test('lesson summaries cannot exceed their eligible denominator', () => {
  const summary = summarizeLessonProgressForTracks(modules, ['ela'], [
    { module_slug: 'ela-one', vocab_viewed_at: 100, homework_completed_at: 200 },
    { module_slug: 'ela-one', vocab_viewed_at: 100, homework_completed_at: 200 },
    { module_slug: 'esl-one', vocab_viewed_at: 100, homework_completed_at: 200 },
  ])

  assert.equal(summary.totalLessons, 1)
  assert.equal(summary.completedLessons, 1)
  assert.equal(summary.reviewedLessons, 1)
})
