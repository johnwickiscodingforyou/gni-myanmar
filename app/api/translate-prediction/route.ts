export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const rateLimitError = checkRateLimit(request)
  if (rateLimitError) return rateLimitError

  try {
    const { prediction_id, prediction_text } = await request.json()
    if (!prediction_id || !prediction_text) {
      return NextResponse.json({ error: 'Missing prediction_id or prediction_text' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check cache first — already translated?
    const { data: cached } = await supabase
      .from('predictions_mm')
      .select('myanmar_brief, translation_status, translation_provider')
      .eq('prediction_id', prediction_id)
      .single()

    if (cached?.translation_status === 'translated' && cached?.myanmar_brief) {
      return NextResponse.json({
        myanmar_brief: cached.myanmar_brief,
        translation_provider: cached.translation_provider,
        cached: true
      })
    }

    // Not cached — translate now via Groq
    const GROQ_KEY = process.env.GROQ_API_KEY || ''
    if (!GROQ_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })
    }

    const prompt = (
      `TRANSLATE THE FOLLOWING INTO MYANMAR LANGUAGE (Burmese Unicode).\n` +
      `Write EXACTLY 3 complete sentences. Each sentence MUST end with ། (Myanmar full stop).\n` +
      `No disclaimers. No extra text. Just the Myanmar translation.\n\n` +
      `${prediction_text}`
    )

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!groqRes.ok) {
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const myanmar_brief = groqData.choices?.[0]?.message?.content?.trim() || ''

    if (!myanmar_brief) {
      return NextResponse.json({ error: 'Empty translation' }, { status: 500 })
    }

    // Save to cache
    await supabase.from('predictions_mm').upsert({
      prediction_id,
      prediction_text,
      myanmar_brief,
      translation_status: 'translated',
      translation_provider: 'groq'
    }, { onConflict: 'prediction_id' })

    return NextResponse.json({
      myanmar_brief,
      translation_provider: 'groq',
      cached: false
    })

  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}