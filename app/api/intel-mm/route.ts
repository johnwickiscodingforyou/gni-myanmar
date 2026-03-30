export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data, error } = await supabase.from('debate_summaries').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return NextResponse.json({ summaries: data || [] })
  } catch (err) {
    return NextResponse.json({ summaries: [], error: 'Failed' }, { status: 500 })
  }
}
