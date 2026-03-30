export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
async function checkUrl(url: string, headers: Record<string,string> = {}): Promise<{ok:boolean;ms:number;status?:number}> {
  const t = Date.now()
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, ms: Date.now()-t, status: res.status }
  } catch { return { ok: false, ms: Date.now()-t } }
}
export async function GET(request: NextRequest) {
  const checks: Record<string, {ok:boolean;ms?:number;status?:number|string}> = {}
  const gniKey = process.env.GNI_API_KEY || process.env.NEXT_PUBLIC_GNI_API_KEY || ''
  const h = { 'X-GNI-Key': gniKey, 'X-Client': 'myanmar-health-v1' }
  const [rep, stk, pred, ev] = await Promise.all([
    checkUrl('https://gni-myanmar.vercel.app/api/reports'),
    checkUrl('https://gni-myanmar.vercel.app/api/stocks?ticker=SPY&range=1d'),
    checkUrl('https://gni-myanmar.vercel.app/api/predictions'),
    checkUrl('https://gni-myanmar.vercel.app/api/article-events'),
  ])
  checks['proxy_reports'] = rep
  checks['proxy_stocks'] = stk
  checks['proxy_predictions'] = pred
  checks['proxy_article_events'] = ev
  checks['autonomous_api'] = await checkUrl('https://gni-autonomous.vercel.app/api/latest', h)
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await supabase.from('debate_summaries').select('created_at').order('created_at', { ascending: false }).limit(1)
    checks['myanmar_supabase'] = { ok: true, ms: 0 }
    if (data && data.length > 0) {
      const ageHours = (Date.now() - new Date(data[0].created_at).getTime()) / 3600000
      checks['pipeline_last_run'] = { ok: ageHours < 14, status: ageHours.toFixed(1)+'h ago' }
    } else {
      checks['pipeline_last_run'] = { ok: false, status: 'No runs yet' }
    }
  } catch { checks['myanmar_supabase'] = { ok: false, ms: 0 }; checks['pipeline_last_run'] = { ok: false, status: 'DB error' } }
  const allOk = Object.values(checks).every(c => c.ok)
  return NextResponse.json({ status: allOk ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() })
}
