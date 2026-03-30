import { NextRequest, NextResponse } from 'next/server'

// GNI-R-149: Rate limiting 200 req/IP/hour
// GNI-R-151: myanmar_summary stripped in reports route
// Exempt: /api/health /api/track /api/track-download

interface RateLimitEntry { count: number; windowStart: number }
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 200
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request)
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return null
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 200 requests per hour per IP.' },
      { status: 429 }
    )
  }
  entry.count += 1
  return null
}

const ALLOWED_RANGES = ['1d', '5d', '7d', '1mo', '3mo', '6mo', '1y', '5y']
const TICKER_REGEX   = /^[A-Z0-9.\-=^]{1,10}$/

export function validateStocksParams(
  ticker: string,
  range: string
): NextResponse | null {
  if (!TICKER_REGEX.test(ticker)) {
    return NextResponse.json(
      { error: 'Invalid ticker format.' },
      { status: 400 }
    )
  }
  if (!ALLOWED_RANGES.includes(range)) {
    return NextResponse.json(
      { error: 'Invalid range. Allowed: 1d 5d 7d 1mo 3mo 6mo 1y 5y' },
      { status: 400 }
    )
  }
  return null
}
