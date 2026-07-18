import type { Client, InStatement } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { localDateKey } from './dates'

export const DEMO_PIN = '1234'

const DAY_MS = 86_400_000
const DEMO_USERS = [
  { name: 'Maria', role: 'student' },
  { name: 'Carlos', role: 'student' },
  { name: 'Sarah', role: 'tutor' },
] as const

const USER_ID_TABLES = [
  'user_tracks',
  'student_settings',
  'vocab_progress',
  'module_progress',
  'teaching_sessions',
  'activity_log',
  'math_progress',
  'math_sessions',
  'math_attempts',
  'math_exam_attempts',
  'math_exam_section_progress',
  'ela_exam_attempts',
  'ela_exam_section_progress',
] as const

export type DemoSeedResult = {
  mariaId: string
  carlosId: string
  sarahId: string
}

function cleanupStatements(userIds: string[]): InStatement[] {
  const statements: InStatement[] = []

  for (const userId of userIds) {
    for (const table of USER_ID_TABLES) {
      statements.push({ sql: `DELETE FROM ${table} WHERE user_id = ?`, args: [userId] })
    }
    statements.push(
      { sql: 'DELETE FROM student_tutors WHERE student_id = ? OR tutor_id = ?', args: [userId, userId] },
      { sql: 'DELETE FROM sessions WHERE student_id = ? OR tutor_id = ?', args: [userId, userId] },
      { sql: 'DELETE FROM attendance WHERE student_id = ?', args: [userId] },
      { sql: 'DELETE FROM tutor_notes WHERE student_id = ? OR tutor_id = ?', args: [userId, userId] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
    )
  }

  return statements
}

export async function seedDemoData(
  db: Client,
  now: number = Date.now(),
): Promise<DemoSeedResult> {
  const pinHash = await bcrypt.hash(DEMO_PIN, 10)
  const mariaId = randomUUID()
  const carlosId = randomUUID()
  const sarahId = randomUUID()
  const dateDaysAgo = (daysAgo: number) => localDateKey(now - daysAgo * DAY_MS)

  const mariaModules: Array<{
    slug: string
    daysAgo: number
    score: number | null
    teachCount: number
    homeworkScore: number | null
  }> = [
    {
      slug: 'introducing-yourself',
      daysAgo: 9,
      score: 90,
      teachCount: 0,
      homeworkScore: 90,
    },
    {
      slug: 'buying-groceries',
      daysAgo: 6,
      score: 80,
      teachCount: 1,
      homeworkScore: 80,
    },
    {
      slug: 'navigating-subway',
      daysAgo: 3,
      score: 80,
      teachCount: 0,
      homeworkScore: null,
    },
  ]

  const mariaVocab: Array<{
    wordId: string
    moduleSlug: string
    interval: number
    repetitions: number
    correct: number
    incorrect: number
  }> = [
    {
      wordId: 'introducing-yourself:my-name-is',
      moduleSlug: 'introducing-yourself',
      interval: 3,
      repetitions: 3,
      correct: 7,
      incorrect: 0,
    },
    {
      wordId: 'introducing-yourself:nice-to-meet-you',
      moduleSlug: 'introducing-yourself',
      interval: 3,
      repetitions: 3,
      correct: 5,
      incorrect: 1,
    },
    {
      wordId: 'buying-groceries:aisle',
      moduleSlug: 'buying-groceries',
      interval: 1,
      repetitions: 1,
      correct: 1,
      incorrect: 3,
    },
    {
      wordId: 'buying-groceries:receipt',
      moduleSlug: 'buying-groceries',
      interval: 1,
      repetitions: 1,
      correct: 2,
      incorrect: 2,
    },
    {
      wordId: 'buying-groceries:how-much',
      moduleSlug: 'buying-groceries',
      interval: 3,
      repetitions: 3,
      correct: 4,
      incorrect: 0,
    },
  ]

  const transaction = await db.transaction('write')
  try {
    const existingDemoUsers = await transaction.execute({
      sql: `
        SELECT id
        FROM users
        WHERE (name = ? AND role = 'student')
           OR (name = ? AND role = 'student')
           OR (name = ? AND role = 'tutor')
      `,
      args: DEMO_USERS.map(user => user.name),
    })
    const previousIds = existingDemoUsers.rows.map(row => String(row.id))
    const cleanup = cleanupStatements(previousIds)
    if (cleanup.length > 0) await transaction.batch(cleanup)

    const statements: InStatement[] = [
      {
        sql: `
          INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
          VALUES (?, ?, NULL, ?, 'student', ?, ?)
        `,
        args: [mariaId, 'Maria', pinHash, now - 2 * DAY_MS, now - DAY_MS],
      },
      {
        sql: `
          INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
          VALUES (?, ?, NULL, ?, 'student', ?, ?)
        `,
        args: [carlosId, 'Carlos', pinHash, now - 5 * DAY_MS, now - 3 * DAY_MS],
      },
      {
        sql: `
          INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active)
          VALUES (?, ?, NULL, ?, 'tutor', ?, ?)
        `,
        args: [sarahId, 'Sarah', pinHash, now - 7 * DAY_MS, now],
      },
      {
        sql: 'INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, ?, ?)',
        args: [mariaId, 'esl', now],
      },
      {
        sql: 'INSERT INTO user_tracks (user_id, track, created_at) VALUES (?, ?, ?)',
        args: [carlosId, 'esl', now],
      },
      {
        sql: 'INSERT INTO student_tutors (student_id, tutor_id, created_at) VALUES (?, ?, ?)',
        args: [mariaId, sarahId, now],
      },
      {
        sql: 'INSERT INTO student_tutors (student_id, tutor_id, created_at) VALUES (?, ?, ?)',
        args: [carlosId, sarahId, now],
      },
    ]

    for (const module of mariaModules) {
      const viewedAt = now - module.daysAgo * DAY_MS
      const practicedAt = module.score === null ? null : viewedAt + DAY_MS
      statements.push({
        sql: `
          INSERT INTO module_progress (
            user_id,
            module_slug,
            vocab_viewed_at,
            practice_completed_at,
            practice_score,
            teach_session_count,
            homework_completed_at,
            homework_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          mariaId,
          module.slug,
          viewedAt,
          practicedAt,
          module.score,
          module.teachCount,
          module.homeworkScore === null ? null : practicedAt,
          module.homeworkScore,
        ],
      })
    }

    statements.push({
      sql: `
        INSERT INTO module_progress (
          user_id,
          module_slug,
          vocab_viewed_at,
          practice_completed_at,
          practice_score,
          teach_session_count,
          homework_completed_at,
          homework_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [carlosId, 'introducing-yourself', now - 3 * DAY_MS, null, null, 0, null, null],
    })

    for (const word of mariaVocab) {
      statements.push({
        sql: `
          INSERT INTO vocab_progress (
            id,
            user_id,
            word_id,
            module_slug,
            interval,
            repetitions,
            next_review_at,
            correct_count,
            incorrect_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          randomUUID(),
          mariaId,
          word.wordId,
          word.moduleSlug,
          word.interval,
          word.repetitions,
          now + word.interval * DAY_MS,
          word.correct,
          word.incorrect,
        ],
      })
    }

    statements.push({
      sql: `
        INSERT INTO teaching_sessions (
          id,
          user_id,
          module_slug,
          started_at,
          ended_at,
          message_count,
          phrases_taught,
          encouragement,
          transcript
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        randomUUID(),
        mariaId,
        'buying-groceries',
        now - 4 * DAY_MS,
        now - 4 * DAY_MS + 600_000,
        12,
        JSON.stringify(['How much does this cost?', 'Where is the...?', 'cash or credit card', 'on sale']),
        'You are a natural teacher! Carlos learned so much from your clear explanations.',
        JSON.stringify([
          { role: 'user', content: 'Hello Carlos! Today I will teach you about buying groceries.' },
          { role: 'assistant', content: 'Oh hello! I need very much help with this. I go store but I not know how to say things.' },
        ]),
      ],
    })

    const scheduledLessons = [
      { studentId: mariaId, daysAgo: 9, moduleSlug: 'introducing-yourself', homeworkAssigned: 1 },
      { studentId: mariaId, daysAgo: 6, moduleSlug: 'buying-groceries', homeworkAssigned: 1 },
      { studentId: mariaId, daysAgo: 3, moduleSlug: 'navigating-subway', homeworkAssigned: 0 },
      { studentId: carlosId, daysAgo: 4, moduleSlug: 'introducing-yourself', homeworkAssigned: 1 },
    ]
    for (const lesson of scheduledLessons) {
      const date = dateDaysAgo(lesson.daysAgo)
      statements.push(
        {
          sql: `
            INSERT INTO sessions (
              id,
              student_id,
              date,
              module_slug,
              tutor_id,
              homework_assigned,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            randomUUID(),
            lesson.studentId,
            date,
            lesson.moduleSlug,
            sarahId,
            lesson.homeworkAssigned,
            now - lesson.daysAgo * DAY_MS,
          ],
        },
        {
          sql: 'INSERT INTO attendance (session_date, student_id, present) VALUES (?, ?, 1)',
          args: [date, lesson.studentId],
        },
      )
    }

    for (const daysAgo of [0, 1, 2, 4, 5, 6]) {
      statements.push({
        sql: 'INSERT INTO activity_log (user_id, date, activity_type, count) VALUES (?, ?, ?, ?)',
        args: [mariaId, dateDaysAgo(daysAgo), 'practice', 3],
      })
      if (daysAgo < 3) {
        statements.push({
          sql: 'INSERT INTO activity_log (user_id, date, activity_type, count) VALUES (?, ?, ?, ?)',
          args: [mariaId, dateDaysAgo(daysAgo), 'module', 1],
        })
      }
    }

    for (const daysAgo of [3, 4]) {
      statements.push({
        sql: 'INSERT INTO activity_log (user_id, date, activity_type, count) VALUES (?, ?, ?, ?)',
        args: [carlosId, dateDaysAgo(daysAgo), 'module', 1],
      })
    }

    await transaction.batch(statements)
    await transaction.commit()
  } finally {
    transaction.close()
  }

  return { mariaId, carlosId, sarahId }
}
