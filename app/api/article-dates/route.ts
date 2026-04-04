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
    // Get distinct run_dates with selected + collected counts for last 30 days
    const { data, error } = await supabase
      .from('article_briefs')
      .select('run_date, is_selected')
      .gte('run_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('run_date', { ascending: false })

    if (error) throw error

    // Group by run_date and count selected vs collected
    const dateMap: Record<string, { selected_count: number; collected_count: number }> = {}
    for (const row of data || []) {
      if (!dateMap[row.run_date]) {
        dateMap[row.run_date] = { selected_count: 0, collected_count: 0 }
      }
      if (row.is_selected) dateMap[row.run_date].selected_count++
      else dateMap[row.run_date].collected_count++
    }

    const dates = Object.entries(dateMap)
      .map(([run_date, counts]) => ({ run_date, ...counts }))
      .sort((a, b) => b.run_date.localeCompare(a.run_date))

    return NextResponse.json({ dates })
  } catch {
    return NextResponse.json({ dates: [], error: 'Failed' }, { status: 500 })
  }
}
