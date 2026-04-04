export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const safeDays = [1, 3, 7, 14].includes(days) ? days : 7
    const res = await fetch(
      `https://gni-autonomous.vercel.app/api/article-events?days=${safeDays}`,
      {
        headers: {
          'X-GNI-Key': process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || '',
          'X-Client': 'gni-myanmar-v1'
        },
        next: { revalidate: 60 }
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
