export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://gni-autonomous.vercel.app/api/article-events', {
      headers: { 'X-Client': 'gni-myanmar-v1' },
      next: { revalidate: 300 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ events: [] }, { status: 500 })
  }
}
