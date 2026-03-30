export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

// GNI-R-149: Rate limiting applied
// GNI-R-151: myanmar_summary stripped -- web display only, never via API

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError

  try {
    const res = await fetch(`https://gni-autonomous.vercel.app/api/reports`, {
      headers: {
        'X-GNI-Key': process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || '',
        'X-Client': 'gni-myanmar-v1'
      },
      next: { revalidate: 300 }
    })
    const data = await res.json()
    // GNI-R-151: strip myanmar_summary before returning to public
    const safeReports = (data.reports || []).map(
      ({ myanmar_summary, ...r }: { myanmar_summary: unknown; [key: string]: unknown }) => r
    )
    return NextResponse.json({ ...data, reports: safeReports })
  } catch (err) {
    return NextResponse.json({ reports: [], error: 'Failed' }, { status: 500 })
  }
}
