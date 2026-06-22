import type { Client } from '@libsql/client'
import { normalizeEmail } from './email-verification'

export const DEFAULT_ADMIN_EMAIL_ALLOWLIST = [
  'julianahhong@gmail.com',
  'richaguir@gmail.com',
  'harvestinthecitynyc@gmail.com',
  'shichengrao@gmail.com',
  'VineAdmin@harvest-nyc.com',
  'aldowiloto@gmail.com',
]

export async function seedDefaultAdminAllowlist(db: Client, createdBy = 'system'): Promise<void> {
  const now = Date.now()
  await db.batch(DEFAULT_ADMIN_EMAIL_ALLOWLIST.map(email => ({
    sql: `
      INSERT INTO admin_email_allowlist (email, created_by, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        created_by = excluded.created_by,
        created_at = excluded.created_at
    `,
    args: [normalizeEmail(email), createdBy, now],
  })))
}

export async function seedDefaultAdminAllowlistIfEmpty(db: Client): Promise<void> {
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM admin_email_allowlist',
    args: [],
  })
  if (Number(result.rows[0]?.count ?? 0) === 0) {
    await seedDefaultAdminAllowlist(db)
  }
}
