import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import {
  getProgramImpact,
  isTestAccount,
  resolveFocus,
  sessionWeeks,
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
      CREATE TABLE math_exam_attempts (id TEXT PRIMARY KEY, user_id TEXT, exam_id TEXT, section_slug TEXT, finished_at INTEGER, points_earned INTEGER, points_possible INTEGER);
      CREATE TABLE ela_exam_attempts (id TEXT PRIMARY KEY, user_id TEXT, exam_id TEXT, section_slug TEXT, finished_at INTEGER, points_earned INTEGER, points_possible INTEGER);
      CREATE TABLE student_tutors (student_id TEXT, tutor_id TEXT, created_at INTEGER, PRIMARY KEY (student_id, tutor_id));
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
})

test('session weeks are the weeks holding a Vine session, up to the current week', () => {
  // Saturdays Oct 24, Nov 14 and Nov 21 (this week) are sessions; Oct 31 and Nov 7 were skipped.
  const dates = ['2026-11-14', '2026-10-24', '2026-11-21', '2026-12-05']
  assert.deepEqual(sessionWeeks(TODAY, dates), {
    weeks: [
      { weekStart: '2026-10-19', sessionDate: '2026-10-24' },
      { weekStart: '2026-11-09', sessionDate: '2026-11-14' },
      { weekStart: '2026-11-16', sessionDate: '2026-11-21' },
    ],
    skipped: ['2026-10-26', '2026-11-02'],
    upcoming: ['2026-12-05'],
  })
  assert.deepEqual(sessionWeeks(TODAY, []), { weeks: [], skipped: [], upcoming: [] })
})

test('the focus defaults to the most recent session held', () => {
  const { weeks } = sessionWeeks(TODAY, ['2026-11-07', '2026-11-14', '2026-11-21'])
  assert.equal(resolveFocus(undefined, weeks, TODAY)?.sessionDate, '2026-11-14')
  assert.equal(resolveFocus('2026-11-07', weeks, TODAY)?.sessionDate, '2026-11-07')
  assert.equal(resolveFocus('2026-11-21', weeks, TODAY)?.sessionDate, '2026-11-21', 'this week, so far')
  assert.equal(resolveFocus('nonsense', weeks, TODAY)?.sessionDate, '2026-11-14')
  assert.equal(resolveFocus('all', weeks, TODAY), null)
})

test('test accounts are recognised by name', () => {
  assert.equal(isTestAccount('TestStudentESL'), true)
  assert.equal(isTestAccount(' testtutor'), true)
  assert.equal(isTestAccount('Teresaa'), false)
})

const SESSIONS = ['2026-11-07', '2026-11-14', '2026-11-21']
const ALL = { today: TODAY, focus: 'all', sessionDates: SESSIONS, now: NOW, timeZone: TZ }

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
    INSERT INTO math_exam_attempts VALUES ('e1', 'ben', 'g5-2023', 'book-1', ${at('2026-11-12')}, 3, 4);
    INSERT INTO student_tutors VALUES ('ana', 't1', 0), ('cy', 't2', 0);
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
    const impact = await getProgramImpact(db, ALL)
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

test('a week without a Vine session is left out of the trends and the totals', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    // No session on Saturday Oct 31 (a retreat), but a student practiced at home that week.
    await db.executeMultiple(`
      INSERT INTO tutor_check_ins VALUES ('2026-10-24', 't1', 1, 0);
      INSERT INTO attendance VALUES ('2026-10-24', 'ana', 1);
      INSERT INTO activity_log VALUES ('ana', '2026-10-28', 'practice', 1), ('ana', '2026-10-21', 'practice', 1);
    `)
    const impact = await getProgramImpact(db, { ...ALL, sessionDates: ['2026-10-24', ...SESSIONS] })
    assert.deepEqual(impact.weeks.map(week => week.weekStart), ['2026-10-19', '2026-11-02', '2026-11-09', '2026-11-16'])
    assert.deepEqual(impact.skippedWeeks, ['2026-10-26'])
    assert.equal(impact.weeks[0].homePracticeStudents, 1)
    assert.equal(impact.period.homePracticeStudents, 2)
    const ana = impact.students.find(student => student.id === 'ana')!
    assert.equal(ana.homePracticeDays, 3, 'Oct 21, Nov 11 and Nov 17; Oct 28 falls in the skipped week')
  })
})

test('student progress, ESL level changes and quiet students', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    const impact = await getProgramImpact(db, ALL)
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
    assert.deepEqual(impact.checkIn.map(student => [student.name, student.group, student.tutorNames]), [['Cy', 'never', ['Tom']]])
    assert.deepEqual(ana.tutorNames, ['Tess'])
  })
})

test('tutor usage and lesson fit', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    const impact = await getProgramImpact(db, ALL)

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

test('focusing on one session week narrows the totals and lists what is behind them', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    // Default focus: the Nov 14 session, the latest one held.
    const impact = await getProgramImpact(db, { ...ALL, focus: undefined })
    assert.equal(impact.focus?.sessionDate, '2026-11-14')
    assert.equal(impact.weeks.length, 3, 'trends still cover every session week')
    assert.equal(impact.period.lessonsTaught, 2)
    assert.equal(impact.period.activeStudents, 2)

    // Every taught lesson is listed, so the rates can be checked line by line.
    assert.deepEqual(impact.taughtLessons.map(lesson => [lesson.studentName, lesson.deck, lesson.wrapUp, lesson.homeworkAssigned, lesson.homeworkDoneOn]), [
      ['Ana', 'used', 'filed', true, '2026-11-15'],
      ['Ben', 'used', 'filed', false, null],
    ])
    assert.deepEqual(impact.taughtLessons[0].deckOpenedBy, ['Tess'])
    assert.equal(impact.taughtLessons[0].deckMinutes, 45)
    assert.deepEqual(impact.quizScores.map(record => [record.studentName, record.score]), [['Ana', 0.8], ['Ben', 0.4]])
    assert.deepEqual(impact.examScores.map(record => [record.studentName, record.examId, record.score]), [['Ben', 'g5-2023', 0.75]])
    assert.deepEqual(impact.deckSessions.map(deck => [deck.tutorName, deck.slug, deck.scheduled]), [['Tess', 'introducing-yourself', true]])

    const ana = impact.students.find(student => student.id === 'ana')!
    assert.equal(ana.lessonsAttended, 1)
    assert.equal(ana.activeDays, 2)
    assert.equal(ana.homePracticeDays, 1)
    assert.equal(ana.daysPresent, 1)
    assert.deepEqual(impact.tutors[0].studentNames, ['Ana', 'Ben'])
    assert.equal(impact.tutors[0].placementsGiven, 2, 'Ana and Ben were placed on Nov 14')

    const nov7 = await getProgramImpact(db, { ...ALL, focus: '2026-11-07' })
    assert.equal(nov7.period.lessonsTaught, 1)
    assert.deepEqual(nov7.taughtLessons.map(lesson => [lesson.studentName, lesson.title, lesson.deck]), [['Ana', 'The Verb "To Be"', 'untracked']])
  })
})

test('test accounts are left out, and students who stopped coming are listed first', async () => {
  await withFixture(async db => {
    await seedProgram(db)
    await db.executeMultiple(`
      INSERT INTO users VALUES ('tst', 'TestStudentESL', 'student', 0), ('tt', 'TestTutor', 'tutor', 0), ('dee', 'Dee', 'student', 0);
      INSERT INTO sessions VALUES ('s7', 'tst', '2026-11-14', 'introducing-yourself', 'tt', 1, 0);
      INSERT INTO lesson_deck_progress VALUES ('tt', '2026-11-14', 'likes-and-dislikes', 3, '', 20, 60000, 0, 0);
      INSERT INTO activity_log VALUES ('tst', '2026-11-14', 'module', 1), ('dee', '2026-11-07', 'module', 1);
      INSERT INTO sessions VALUES ('s8', 'dee', '2026-11-07', 'verb-to-be', 't1', 0, 0);
    `)
    // Sessions Oct 31, Nov 7 and Nov 14: Dee came on Nov 7 and hasn't been seen since.
    const impact = await getProgramImpact(db, { ...ALL, sessionDates: ['2026-10-31', ...SESSIONS] })
    assert.equal(impact.testAccounts, 2)
    assert.equal(impact.students.some(student => student.name.startsWith('Test')), false)
    assert.equal(impact.tutors.some(tutor => tutor.name.startsWith('Test')), false)
    assert.equal(impact.deckSessions.some(deck => deck.slug === 'likes-and-dislikes'), false)
    assert.equal(impact.totalStudents, 4)
    assert.equal(impact.period.lessonsTaught, 4, "the test student's lesson is not counted")

    // Dee missed only Nov 14, one session: not yet worth a call.
    assert.deepEqual(impact.checkIn.map(student => student.name), ['Cy'])
    const later = await getProgramImpact(db, { ...ALL, today: '2026-11-22', now: NOW + 5 * 86_400_000, sessionDates: ['2026-10-31', ...SESSIONS] })
    const dee = later.checkIn.find(student => student.name === 'Dee')!
    assert.equal(dee.group, 'stopped')
    assert.equal(dee.sessionsMissed, 2)
    assert.equal(dee.vineLessons, 1)
    assert.deepEqual(later.checkIn.map(student => student.name), ['Dee', 'Cy'], 'most recently seen first, never seen last')
  })
})
