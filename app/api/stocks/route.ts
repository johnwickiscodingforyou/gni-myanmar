export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker') || 'SPY'
    const range = searchParams.get('range') || '7d'
    const res = await fetch(`https://gni-autonomous.vercel.app/api/stocks?ticker=${encodeURIComponent(ticker)}&range=${range}`, {
      headers: { 'X-GNI-Key': process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || '', 'X-Client': 'gni-myanmar-v1' },
      next: { revalidate: 300 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
