import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  getProgramImpact,
  parseTrendWeeks,
  trendWeekStarts,
  weekStartOf,
} from '../lib/admin-metrics'
import { LESSON_DECK_PROGRESS_TABLE_SQL, SESSION_WRAP_UPS_TABLE_SQL } from '../lib/session-metrics'
import { ESL_PLACEMENTS_TABLE_SQL } from '../lib/esl-placement'

const TZ = 'America/New_York'
const near = (actual: number | null, expected: number) =>
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`)
// Tuesday 2026-11-17, midday in New York.
const NOW = Date.UTC(2026, 10, 17, 17, 0, 0)
const TODAY = '2026-11-17'
const at = (date: string, hourUtc = 17) => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, hourUtc)
}

async function withFixture(run: (db: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'vine-admin-metrics-'))
  const db = createClient({ url: `file:${join(directory, 'fixture.db')}` })
  try {
    await db.executeMultiple(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE user_tracks (user_id TEXT, track TEXT, created_at INTEGER, PRIMARY KEY (user_id, track));
      CREATE TABLE activity_log (user_id TEXT, date TEXT, activity_type TEXT, count INTEGER, PRIMARY KEY (user_id, date, activity_type));
      CREATE TABLE sessions (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, module_slug TEXT, tutor_id TEXT, homework_assigned INTEGER DEFAULT 0, created_at INTEGER);
      CREATE TABLE attendance (session_date TEXT, student_id TEXT, present INTEGER, PRIMARY KEY (session_date, student_id));
      CREATE TABLE tutor_check_ins (session_date TEXT, tutor_id TEXT, present INTEGER, recorded_at INTEGER, PRIMARY KEY (session_date, tutor_id));
      CREATE TABLE module_progress (
        user_id TEXT, module_slug TEXT, practice_completed_at INTEGER, practice_score INTEGER,
        homework_completed_at INTEGER, homework_score INTEGER, PRIMARY KEY (user_id, module_slug)
      );
      CREATE TABLE math_exam_attempts (id TEXT PRIMARY KEY, user_id TEXT, finished_at INTEGER, points_earned INTEGER, points_possible INTEGER);
      CREATE TABLE ela_exam_attempts (id TEXT PRIMARY KEY, user_id TEXT, finished_at INTEGER, points_earned INTEGER, points_possible INTEGER);
      CREATE TABLE vocab_progress (id TEXT PRIMARY KEY, user_id TEXT, word_id TEXT, correct_count INTEGER);
    `)
    await db.execute(LESSON_DECK_PROGRESS_TABLE_SQL)
    await db.execute(SESSION_WRAP_UPS_TABLE_SQL)
    await db.execute(ESL_PLACEMENTS_TABLE_SQL)
    await run(db)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

test('weeks start on Monday and end with the current week', () => {
  assert.equal(weekStartOf('2026-11-17'), '2026-11-16')
  assert.equal(weekStartOf('2026-11-16'), '2026-11-16')
  assert.equal(weekStartOf('2026-11-15'), '2026-11-09')
  assert.deepEqual(trendWeekStarts(TODAY, 3), ['2026-11-02', '2026-11-09', '2026-11-16'])
})

test('parseTrendWeeks falls back to the default for unknown values', () => {
  assert.equal(parseTrendWeeks('4'), 4)
  assert.equal(parseTrendWeeks('12'), 12)
  assert.equal(parseTrendWeeks('7'), 8)
  assert.equal(parseTrendWeeks(undefined), 8)
})

async function seedProgram(db: Client) {
  const placement = (id: string, student: string, date: string, level: string) =>
    `('${id}', '${student}', 't1', '${date}', 'v1', '{}', 0, NULL, '${level}', '${level}', '', NULL, ${at(date)})`
  await db.executeMultiple(`
    INSERT INTO users VALUES
      ('ana', 'Ana', 'student', 0), ('ben', 'Ben', 'student', 0), ('cy', 'Cy', 'student', 0),
      ('t1', 'Tess', 'tutor', 0), ('t2', 'Tom', 'tutor', 0);
    INSERT INTO user_tracks VALUES ('ana', 'esl', 0), ('ben', 'esl', 0), ('cy', 'esl', 0);
    INSERT INTO sessions VALUES
      ('s1', 'ana', '2026-11-14', 'introducing-yourself', 't1', 1, 0),
      ('s2', 'ben', '2026-11-14', 'introducing-yourself', 't1', 0, 0),
      ('s3', 'cy',  '2026-11-14', 'introducing-yourself', 't1', 1, 0),
      ('s4', 'ana', '2026-11-21', 'verb-to-have', 't1', 1, 0),
      ('s5', 'ana', '2026-11-07', 'verb-to-be', 't1', 1, 0),
      -- A deleted student's lesson is left behind by deleteUserProfile.
      ('s6', 'ghost', '2026-11-14', 'introducing-yourself', 't1', 1, 0);
    INSERT INTO attendance VALUES
      ('2026-11-14', 'ana', 1), ('2026-11-14', 'ben', 1), ('2026-11-14', 'cy', 0), ('2026-11-07', 'ana', 1);
    INSERT INTO tutor_check_ins VALUES ('2026-11-14', 't1', 1, 0), ('2026-11-07', 't1', 1, 0);
    INSERT INTO lesson_deck_progress VALUES ('t1', '2026-11-14', 'introducing-yourself', 9, 'Role play', 20, 2700000, 0, 0);
    INSERT INTO session_wrap_ups (session_id, tutor_id, finished_lesson, stopped_at, rating, created_at, updated_at) VALUES
      ('s1', 't1', 0, 'Role play', 4, 0, 0),
      ('s2', 't1', 0, 'Role play', 2, 0, 0),
      ('s5', 't1', 1, NULL, 5, 0, 0);
    INSERT INTO module_progress VALUES
      ('ana', 'introducing-yourself', ${at('2026-11-14')}, 80, ${at('2026-11-15')}, 90),
      ('ben', 'introducing-yourself', ${at('2026-11-14')}, 40, NULL, NULL),
      ('ana', 'verb-to-be', NULL, NULL, ${at('2026-11-05')}, 70);
    INSERT INTO activity_log VALUES
      ('ana', '2026-11-14', 'module', 1), ('ana', '2026-11-11', 'practice', 1),
      ('ben', '2026-11-12', 'practice', 1), ('ben', '2026-11-14', 'module', 1),
      ('ana', '2026-11-17', 'practice', 1), ('t1', '2026-11-12', 'teach', 1);
    INSERT INTO math_exam_attempts VALUES ('e1', 'ben', ${at('2026-11-12')}, 3, 4);
    INSERT INTO vocab_progress VALUES ('v1', 'ana', 'w1', 3), ('v2', 'ana', 'w2', 5), ('v3', 'ana', 'w3', 1);
    INSERT INTO esl_placements VALUES
      ${placement('p1', 'ana', '2026-10-01', 'beginner')},
      ${placement('p2', 'ana', '2026-11-14', 'low-intermediate')},
      ${placement('p3', 'ben', '2026-11-14', 'beginner')},
      ${placement('p4', 'ghost', '2026-11-14', 'beginner')};
  `)
}

test('weekly learning and tutor-use measures', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    const impact = await getProgramImpact(db, { today: TODAY, weeks: 3, now: NOW, timeZone: TZ })
    assert.deepEqual(impact.weeks.map(week => week.partial), [false, false, true])
    const [first, middle, current] = impact.weeks

    // Week of Nov 9: Saturday class for Ana and Ben; Cy was marked absent, so her lesson isn't taught.
    assert.equal(middle.lessonsTaught, 2)
    assert.equal(middle.deckUseRate, 1)
    assert.equal(middle.wrapUpRate, 1)
    assert.equal(middle.homeworkAssignedRate, 0.5)
    assert.equal(middle.homeworkCompletionRate, 1)
    near(middle.quizAverage, 0.6)
    assert.equal(middle.homePracticeStudents, 2, 'practice on non-session days')
    assert.equal(middle.activeStudents, 2, 'tutor activity is not counted')
    assert.equal(middle.attendanceRate, 2 / 3)
    assert.equal(middle.examAverageScore, 0.75)

    // Week of Nov 2: homework finished before the lesson doesn't count as doing the assigned homework.
    assert.equal(first.lessonsTaught, 1)
    assert.equal(first.deckUseRate, null, 'slide tracking had not started yet')
    assert.equal(first.wrapUpRate, 1)
    assert.equal(first.homeworkCompletionRate, 0)
    assert.equal(first.homeworkAverage, 0.7)

    // The future lesson on Nov 21 is not taught yet.
    assert.equal(current.lessonsTaught, 0)
    assert.equal(current.deckUseRate, null)

    assert.equal(impact.period.lessonsTaught, 3, 'the deleted student is not counted')
    assert.equal(impact.period.deckTrackedLessons, 2)
    assert.equal(impact.period.deckUseRate, 1)
    assert.deepEqual(impact.trackingSince, { deck: '2026-11-14', wrapUps: '2026-11-07', placements: '2026-10-01' })
    assert.equal(impact.period.homeworkCompletionRate, 0.5)
  })
})

test('student progress, ESL level changes and quiet students', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    const impact = await getProgramImpact(db, { today: TODAY, weeks: 3, now: NOW, timeZone: TZ })
    const ana = impact.students.find(student => student.id === 'ana')!
    assert.equal(ana.firstLevel, 'Beginner')
    assert.equal(ana.currentLevel, 'Low-intermediate')
    assert.equal(ana.movedUp, true)
    assert.equal(ana.lessonsAttended, 2)
    assert.equal(ana.homeworkAssigned, 2)
    assert.equal(ana.homeworkDone, 1)
    assert.equal(ana.homePracticeDays, 2)
    assert.equal(ana.wordsMastered, 2)
    assert.equal(ana.quizAverage, 0.8)

    const ben = impact.students.find(student => student.id === 'ben')!
    assert.equal(ben.placements, 1)
    assert.equal(ben.movedUp, false)
    assert.equal(ben.placementDue, false)
    assert.equal(impact.students.find(student => student.id === 'cy')!.placementDue, true)

    assert.deepEqual(impact.eslLevels, { eslStudents: 3, placed: 2, retested: 1, movedUp: 1 })
    assert.deepEqual(impact.quietStudents.map(student => [student.name, student.lastSeen]), [['Cy', null]])
  })
})

test('tutor usage and lesson fit', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    const impact = await getProgramImpact(db, { today: TODAY, weeks: 3, now: NOW, timeZone: TZ })

    const [tess, tom] = impact.tutors
    assert.equal(tess.name, 'Tess')
    assert.equal(tess.lessonsTaught, 3)
    assert.equal(tess.studentsTaught, 2)
    assert.equal(tess.sessionDays, 2)
    assert.equal(tess.deckUseRate, 1)
    assert.equal(tess.wrapUpRate, 1)
    assert.equal(tess.homeworkAssignedRate, 2 / 3)
    near(tess.averageRatingGiven, 11 / 3)
    assert.equal(tess.averageDeckMinutes, 45)
    assert.equal(tess.placementsGiven, 2, 'only placements inside the period')
    assert.equal(tess.lastTaught, '2026-11-14')
    assert.equal(tom.lessonsTaught, 0)

    const intro = impact.lessons.find(lesson => lesson.slug === 'introducing-yourself')!
    assert.equal(intro.position, 1)
    assert.equal(intro.classesTaught, 1, 'one class even with two students in it')
    assert.equal(intro.studentsTaught, 2)
    assert.equal(intro.averageDeckMinutes, 45)
    assert.equal(intro.averageDeckReach, 0.5)
    assert.equal(intro.finishedRate, 0)
    assert.equal(intro.commonStoppingPoint, 'Role play')
    assert.equal(intro.averageRating, 3)
    near(intro.quizAverage, 0.6)
    assert.equal(intro.quizCount, 2)

    const verbToBe = impact.lessons.find(lesson => lesson.slug === 'verb-to-be')!
    assert.equal(verbToBe.finishedRate, 1)
    assert.equal(impact.lessons.find(lesson => lesson.slug === 'verb-to-have')!.classesTaught, 0)
  })
})
