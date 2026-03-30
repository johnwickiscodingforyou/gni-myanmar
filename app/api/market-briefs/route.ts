export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    let query = supabase.from('market_briefs').select('*').order('created_at', { ascending: false }).limit(20)
    if (category) query = query.eq('category', category)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ briefs: data || [] })
  } catch (err) {
    return NextResponse.json({ briefs: [], error: 'Failed' }, { status: 500 })
  }
}
