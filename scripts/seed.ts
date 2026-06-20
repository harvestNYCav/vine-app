import getDb from '../lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

async function seed() {
  const db = await getDb()

  const PIN = '1234'
  const pinHash = await bcrypt.hash(PIN, 10)
  const now = Date.now()

  // Clear existing demo data
  await db.execute({ sql: "DELETE FROM users WHERE name IN ('Maria', 'Carlos', 'Sarah')", args: [] })

  const mariaId = randomUUID()
  const carlosId = randomUUID()
  const sarahId = randomUUID()

  await db.execute({
    sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    args: [mariaId, 'Maria', pinHash, 'student', now - 2 * 86400000, now - 86400000],
  })
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    args: [carlosId, 'Carlos', pinHash, 'student', now - 5 * 86400000, now - 3 * 86400000],
  })
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, pin_hash, role, created_at, last_active) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    args: [sarahId, 'Sarah', pinHash, 'tutor', now - 7 * 86400000, now],
  })

  const mariaModules = ['introducing-yourself', 'buying-groceries', 'navigating-subway']
  for (const slug of mariaModules) {
    await db.execute({ sql: 'INSERT OR REPLACE INTO module_progress VALUES (?, ?, ?, ?, ?, ?)', args: [mariaId, slug, now - 7 * 86400000, now - 5 * 86400000, 80, slug === 'buying-groceries' ? 1 : 0] })
  }

  const mariaVocab: [string, string, number, number, number][] = [
    ['introducing-yourself:my-name-is', 'introducing-yourself', 3, 7, 0],
    ['introducing-yourself:nice-to-meet-you', 'introducing-yourself', 3, 5, 1],
    ['buying-groceries:aisle', 'buying-groceries', 1, 1, 3],
    ['buying-groceries:receipt', 'buying-groceries', 1, 2, 2],
    ['buying-groceries:how-much', 'buying-groceries', 3, 4, 0],
  ]
  for (const [wordId, moduleSlug, interval, correct, incorrect] of mariaVocab) {
    await db.execute({ sql: 'INSERT OR REPLACE INTO vocab_progress VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [randomUUID(), mariaId, wordId, moduleSlug, interval, correct, now + interval * 86400000, correct, incorrect] })
  }

  await db.execute({
    sql: 'INSERT OR REPLACE INTO teaching_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [
      randomUUID(), mariaId, 'buying-groceries', now - 4 * 86400000, now - 4 * 86400000 + 600000, 12,
      JSON.stringify(['How much does this cost?', 'Where is the...?', 'cash or credit card', 'on sale']),
      'You are a natural teacher! Carlos learned so much from your clear explanations.',
      JSON.stringify([
        { role: 'user', content: 'Hello Carlos! Today I will teach you about buying groceries.' },
        { role: 'assistant', content: 'Oh hello! I need very much help with this. I go store but I not know how to say things.' },
      ]),
    ],
  })

  const mariaDays = [0, 1, 2, 4, 5, 6]
  for (const daysAgo of mariaDays) {
    const date = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
    await db.execute({ sql: 'INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)', args: [mariaId, date, 'practice', 3] })
    if (daysAgo < 3) {
      await db.execute({ sql: 'INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)', args: [mariaId, date, 'module', 1] })
    }
  }

  await db.execute({ sql: 'INSERT OR REPLACE INTO module_progress VALUES (?, ?, ?, ?, ?, ?)', args: [carlosId, 'introducing-yourself', now - 3 * 86400000, null, null, 0] })
  for (const daysAgo of [3, 4]) {
    const date = new Date(now - daysAgo * 86400000).toISOString().split('T')[0]
    await db.execute({ sql: 'INSERT OR IGNORE INTO activity_log VALUES (?, ?, ?, ?)', args: [carlosId, date, 'module', 1] })
  }

  console.log('✅ Seed complete!')
  console.log('   Students: Maria (PIN: 1234), Carlos (PIN: 1234)')
  console.log('   Tutor: Sarah (PIN: 1234)')
  console.log('   All accounts use PIN: 1234')
}

seed().catch(console.error)
