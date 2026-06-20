import { randomInt } from 'crypto'

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
      throw new Error('Email delivery is not configured')
    }
    console.info(`Admin verification code for ${email}: ${code}`)
    return { devCode: code }
  }

  const from = process.env.ADMIN_EMAIL_FROM || 'Vine <onboarding@resend.dev>'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Vine admin verification code',
      text: `Your Vine admin verification code is ${code}. It expires in 10 minutes.`,
    }),
  })

  if (!response.ok) {
    throw new Error('Email delivery failed')
  }

  return {}
}
