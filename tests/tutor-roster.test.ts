import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterTutorRosterStudents,
  normalizeTutorRosterScope,
  tutorRosterScopeCookieName,
} from '../lib/tutor-roster'

const students = [
  { id: 'student-1', name: 'Amina' },
  { id: 'student-2', name: 'Diego' },
  { id: 'student-3', name: 'Sofia' },
]

test('tutor roster defaults to assigned students and can explicitly show everyone', () => {
  const assignedIds = new Set(['student-2'])
  assert.equal(normalizeTutorRosterScope(undefined), 'assigned')
  assert.deepEqual(filterTutorRosterStudents(students, assignedIds, 'assigned'), [students[1]])
  assert.deepEqual(filterTutorRosterStudents(students, assignedIds, 'all'), students)
})

test('roster preference cookies are namespaced per tutor on shared devices', () => {
  const firstTutorCookie = tutorRosterScopeCookieName('tutor-1')
  const secondTutorCookie = tutorRosterScopeCookieName('tutor-2')
  assert.notEqual(firstTutorCookie, secondTutorCookie)
  assert.match(firstTutorCookie, /^vine_tutor_roster_scope_/)
})
