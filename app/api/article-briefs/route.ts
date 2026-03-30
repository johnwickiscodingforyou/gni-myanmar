export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const { searchParams } = new URL(request.url)
    const selectedOnly = searchParams.get('selected') === 'true'
    const geoOnly = searchParams.get('geo') === 'true'
    const dateFilter = searchParams.get('date')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    let query = supabase.from('article_briefs').select('*').order('created_at', { ascending: false }).limit(limit)
    if (selectedOnly) query = query.eq('is_selected', true)
    if (geoOnly) query = query.eq('has_geo', true).eq('is_selected', true)
    if (dateFilter) query = query.eq('run_date', dateFilter)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ articles: data || [] })
  } catch (err) {
    return NextResponse.json({ articles: [], error: 'Failed' }, { status: 500 })
  }
}
