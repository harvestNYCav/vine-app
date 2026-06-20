import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const acceptsHtml = req.headers.get('accept')?.includes('text/html') ?? false
  const response = acceptsHtml
    ? NextResponse.redirect(new URL('/', req.url))
    : NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
