import type { Client } from '@libsql/client'
import { isValidEmail, normalizeEmail } from './email-verification'

// Admin emails are personal addresses, so they are not written into this public
// repo. ADMIN_EMAILS (comma-separated, set in the deployment's environment) seeds
// admin_email_allowlist on a new or reset database. After that, admins manage the
// table from /admin.
export function configuredAdminEmails(value = process.env.ADMIN_EMAILS): string[] {
  if (!value) return []
  const emails = value.split(/[\s,;]+/).map(normalizeEmail).filter(isValidEmail)
  return [...new Set(emails)]
}

export async function seedDefaultAdminAllowlist(db: Client, createdBy = 'system'): Promise<void> {
  const emails = configuredAdminEmails()
  if (emails.length === 0) return
  const now = Date.now()
  await db.batch(emails.map(email => ({
    sql: `
      INSERT INTO admin_email_allowlist (email, created_by, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        created_by = excluded.created_by,
        created_at = excluded.created_at
    `,
    args: [email, createdBy, now],
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
