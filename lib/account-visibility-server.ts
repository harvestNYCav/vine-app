import 'server-only'

import { cookies } from 'next/headers'
import { SHOW_TEST_ACCOUNTS_COOKIE, showTestAccountsFromCookie } from './account-visibility'

// Whether this admin has "Show test accounts" on. Off by default.
export async function getShowTestAccounts(): Promise<boolean> {
  const cookieStore = await cookies()
  return showTestAccountsFromCookie(cookieStore.get(SHOW_TEST_ACCOUNTS_COOKIE)?.value)
}
