export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, validateStocksParams } from '@/lib/rateLimit'

// GNI-R-149: Rate limiting + input validation applied

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError

  try {
    const { searchParams } = new URL(request.url)
    const ticker = (searchParams.get('ticker') || 'SPY').toUpperCase()
    const range  = searchParams.get('range') || '7d'

    const validationError = validateStocksParams(ticker, range)
    if (validationError) return validationError

    const res = await fetch(
      `https://gni-autonomous.vercel.app/api/stocks?ticker=${encodeURIComponent(ticker)}&range=${range}`,
      {
        headers: {
          'X-GNI-Key': process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || '',
          'X-Client': 'gni-myanmar-v1'
        },
        next: { revalidate: 300 }
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
