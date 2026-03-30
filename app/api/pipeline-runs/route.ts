export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const res = await fetch('https://gni-autonomous.vercel.app/api/pipeline-runs', {
      headers: { 'X-GNI-Key': process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || '', 'X-Client': 'gni-myanmar-v1' },
      next: { revalidate: 300 }
    })
    return NextResponse.json(await res.json())
  } catch (err) {
    return NextResponse.json({ runs: [], error: 'Failed' }, { status: 500 })
  }
}
