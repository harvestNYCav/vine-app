import { randomInt } from 'crypto'

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailConfigError'
  }
}

export class EmailDeliveryError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'EmailDeliveryError'
    this.status = status
    this.details = details
  }
}

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function createVerificationCode(): string {
  return String(randomInt(0, 1000000)).padStart(6, '0')
}

export async function sendAdminVerificationEmail(email: string, code: string): Promise<{ devCode?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailConfigError('Set RESEND_API_KEY in production to send admin verification codes.')
    }
    console.info(`Admin verification code for ${email}: ${code}`)
    return { devCode: code }
  }

  const from = process.env.ADMIN_EMAIL_FROM?.trim()
  if (!from) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailConfigError(
        'Set ADMIN_EMAIL_FROM to a verified Resend sender, for example "Vine <admin@mail.harvest-nyc.com>".'
      )
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'Vine <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Vine admin verification code',
      text: `Your Vine admin verification code is ${code}. It expires in 10 minutes.`,
    }),
  })

  if (!response.ok) {
    const bodyText = await response.text()
    let details: unknown = bodyText
    try {
      details = JSON.parse(bodyText)
    } catch {
      // Resend usually returns JSON, but keep the text body if it does not.
    }
    throw new EmailDeliveryError('Resend rejected the admin verification email.', response.status, details)
  }

  return {}
}
