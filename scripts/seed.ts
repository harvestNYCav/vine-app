import getDb from '../lib/db'
import { DEMO_PIN, seedDemoData } from '../lib/demo-seed'

async function main(): Promise<void> {
  const db = await getDb()
  try {
    await seedDemoData(db)
  } finally {
    db.close()
  }

  console.log('✅ Seed complete!')
  console.log(`   Students: Maria (PIN: ${DEMO_PIN}), Carlos (PIN: ${DEMO_PIN})`)
  console.log(`   Tutor: Sarah (PIN: ${DEMO_PIN})`)
}

main().catch(error => {
  console.error('Demo seed failed:', error)
  process.exitCode = 1
})
