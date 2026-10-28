import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import {
  getStudentRegentsCourses,
  normalizeRegentsCourses,
  regentsCoursesMatchPlacement,
  replaceStudentRegentsCourses,
  STUDENT_REGENTS_COURSES_TABLE_SQL,
} from '../lib/regents-courses'
import { studentCanAccessRegentsExam } from '../lib/regents-exam-access'

test('course normalization accepts only known Regents courses in a stable order', () => {
  assert.deepEqual(normalizeRegentsCourses(['english', 'algebra-ii', 'algebra-i', 'english']), [
    'algebra-i', 'algebra-ii', 'english',
  ])
  assert.deepEqual(normalizeRegentsCourses([]), [])
  assert.equal(normalizeRegentsCourses(['chemistry']), null)
  assert.equal(normalizeRegentsCourses('algebra-i'), null)
  assert.equal(normalizeRegentsCourses(null), null)
})

test('Regents access requires both the course assignment and its subject track', () => {
  const courses = ['algebra-i', 'english'] as const
  assert.equal(studentCanAccessRegentsExam(['math'], courses, { course: 'algebra-i' }), true)
  assert.equal(studentCanAccessRegentsExam(['math'], courses, { course: 'geometry' }), false)
  assert.equal(studentCanAccessRegentsExam(['math'], courses, { course: 'english' }), false)
  assert.equal(studentCanAccessRegentsExam(['ela'], courses, { course: 'english' }), true)
  assert.equal(studentCanAccessRegentsExam(['ela'], [], { course: 'english' }), false)
  assert.equal(regentsCoursesMatchPlacement(['algebra-i'], ['math'], 9), true)
  assert.equal(regentsCoursesMatchPlacement(['algebra-i'], ['math'], null), false)
  assert.equal(regentsCoursesMatchPlacement(['english'], ['math'], 11), false)
  assert.equal(regentsCoursesMatchPlacement([], ['math'], 11), true)
})

test('course assignments replace the prior set and can be cleared', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vine-regents-courses-'))
  const db = createClient({ url: `file:${join(directory, 'courses.db')}` })
  try {
    await db.execute(STUDENT_REGENTS_COURSES_TABLE_SQL)
    await db.executeMultiple(`
      CREATE TABLE student_settings (
        user_id TEXT PRIMARY KEY,
        grade_level INTEGER,
        high_school_grade_level INTEGER
      );
      INSERT INTO student_settings (user_id, grade_level, high_school_grade_level)
      VALUES ('student-a', NULL, 11);
    `)
    await replaceStudentRegentsCourses(db, 'student-a', ['english', 'algebra-i'])
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), ['algebra-i', 'english'])

    await replaceStudentRegentsCourses(db, 'student-a', ['geometry'])
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), ['geometry'])
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-b'), [])

    // A stale course row cannot grant access after a grade-placement change.
    await db.execute("UPDATE student_settings SET high_school_grade_level = NULL, grade_level = 8 WHERE user_id = 'student-a'")
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), [])
    await db.execute("UPDATE student_settings SET high_school_grade_level = 11 WHERE user_id = 'student-a'")
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), [])
    await db.execute("UPDATE student_settings SET grade_level = NULL WHERE user_id = 'student-a'")
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), ['geometry'])

    await replaceStudentRegentsCourses(db, 'student-a', [])
    assert.deepEqual(await getStudentRegentsCourses(db, 'student-a'), [])
    await assert.rejects(db.execute({
      sql: 'INSERT INTO student_regents_courses (user_id, course, assigned_at) VALUES (?, ?, ?)',
      args: ['student-a', 'chemistry', Date.now()],
    }))
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
