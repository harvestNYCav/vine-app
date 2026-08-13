import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeTutorPairings } from '../lib/tutor-pairings'

const tutorNames = new Map([
  ['tutor-sarah', 'Sarah'],
  ['tutor-alex', 'Alex'],
  ['tutor-noor', 'Noor'],
])

test('a student\'s pairings are ranked by how many session days each tutor ran', () => {
  const pairings = summarizeTutorPairings([
    { studentId: 'student-1', tutorId: 'tutor-alex', sessionDays: 2, lastDate: '2026-08-01' },
    { studentId: 'student-1', tutorId: 'tutor-sarah', sessionDays: 6, lastDate: '2026-07-25' },
    { studentId: 'student-2', tutorId: 'tutor-noor', sessionDays: 1, lastDate: '2026-08-08' },
  ], tutorNames)

  assert.deepEqual(pairings.get('student-1')?.map(pairing => pairing.tutorName), ['Sarah', 'Alex'])
  assert.deepEqual(pairings.get('student-2')?.map(pairing => pairing.tutorName), ['Noor'])
})

test('an equally frequent tutor who taught more recently is offered first', () => {
  const pairings = summarizeTutorPairings([
    { studentId: 'student-1', tutorId: 'tutor-sarah', sessionDays: 3, lastDate: '2026-07-04' },
    { studentId: 'student-1', tutorId: 'tutor-alex', sessionDays: 3, lastDate: '2026-08-08' },
  ], tutorNames)

  assert.deepEqual(pairings.get('student-1')?.map(pairing => pairing.tutorName), ['Alex', 'Sarah'])
})

test('sessions from a deleted tutor stay visible instead of vanishing from the count', () => {
  const pairings = summarizeTutorPairings([
    { studentId: 'student-1', tutorId: 'tutor-gone', sessionDays: 4, lastDate: '2026-06-06' },
  ], tutorNames)

  assert.deepEqual(pairings.get('student-1'), [
    { tutorId: 'tutor-gone', tutorName: 'Former tutor', sessionDays: 4, lastDate: '2026-06-06' },
  ])
})

test('students with no taught sessions have no pairings at all', () => {
  const pairings = summarizeTutorPairings([
    { studentId: 'student-1', tutorId: 'tutor-sarah', sessionDays: 0, lastDate: '2026-06-06' },
  ], tutorNames)

  assert.equal(pairings.has('student-1'), false)
})
