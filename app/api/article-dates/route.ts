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

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    // Fetch selected counts per date
    const { data: selectedData, error: e1 } = await supabase
      .from('article_briefs')
      .select('run_date')
      .eq('is_selected', true)
      .gte('run_date', cutoff)
      .limit(10000)

    if (e1) throw e1

    // Fetch collected counts per date
    const { data: collectedData, error: e2 } = await supabase
      .from('article_briefs')
      .select('run_date')
      .eq('is_selected', false)
      .gte('run_date', cutoff)
      .limit(10000)

    if (e2) throw e2

    // Count per date for selected
    const selectedCounts: Record<string, number> = {}
    for (const row of selectedData || []) {
      selectedCounts[row.run_date] = (selectedCounts[row.run_date] || 0) + 1
    }

    // Count per date for collected
    const collectedCounts: Record<string, number> = {}
    for (const row of collectedData || []) {
      collectedCounts[row.run_date] = (collectedCounts[row.run_date] || 0) + 1
    }

    // Merge all dates
    const allDates = new Set([
      ...Object.keys(selectedCounts),
      ...Object.keys(collectedCounts)
    ])

    const dates = Array.from(allDates)
      .map(run_date => ({
        run_date,
        selected_count: selectedCounts[run_date] || 0,
        collected_count: collectedCounts[run_date] || 0,
      }))
      .sort((a, b) => b.run_date.localeCompare(a.run_date))

    return NextResponse.json({ dates })
  } catch {
    return NextResponse.json({ dates: [], error: 'Failed' }, { status: 500 })
  }
}
