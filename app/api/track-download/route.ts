export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dataset = (body.dataset || 'unknown').slice(0, 50)
    const file_format = (body.format || 'csv').slice(0, 10)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.from('download_stats').insert({ dataset_name: dataset, file_format })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
