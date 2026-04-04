export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Query the pre-computed Supabase view — returns only 30 rows, instant!
    // View: article_date_counts (created 2026-04-04)
    // Auto-filters last 30 days, groups by run_date, counts selected vs collected
    const { data, error } = await supabase
      .from('article_date_counts')
      .select('*')
      .order('run_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ dates: data || [] })
  } catch {
    return NextResponse.json({ dates: [], error: 'Failed' }, { status: 500 })
  }
}
