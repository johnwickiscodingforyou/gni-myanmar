export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const page = (body.page || '/').slice(0, 100)
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown'
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.from('page_views').insert({ page, country })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
