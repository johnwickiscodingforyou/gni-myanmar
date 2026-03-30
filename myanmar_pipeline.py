#!/usr/bin/env python3
"""
myanmar_pipeline.py -- GNI Myanmar Intelligence Pipeline
Phase 2 | Team Geeks | March 31, 2026
"""

import os, sys, json, time, csv, io
from datetime import datetime, timezone, timedelta
import requests
# Groq via direct REST (groq library has Azure IP issues on GitHub Actions)
from supabase import create_client

GNI_API    = 'https://gni-autonomous.vercel.app'
GNI_KEY    = os.getenv('GNI_API_KEY', '')
GROQ_KEY   = os.getenv('GROQ_API_KEY', '').strip()
SUPA_URL   = os.getenv('SUPABASE_URL', '')
SUPA_KEY   = os.getenv('SUPABASE_SERVICE_KEY', '')
TG_TOKEN   = os.getenv('TELEGRAM_BOT_TOKEN', '')
TG_CHANNEL = os.getenv('TELEGRAM_CHANNEL_ID', '-1003855420750')
GROQ_MODEL = 'llama-3.1-8b-instant'
FRESHNESS_HRS = 2.0

def log(msg): print(msg, flush=True)

def get_groq():
    if not GROQ_KEY: raise Exception('GROQ_API_KEY not set')
    return GROQ_KEY  # return key directly -- used by groq_gen via REST

def get_supa():
    if not SUPA_URL or not SUPA_KEY: raise Exception('Supabase creds not set')
    return create_client(SUPA_URL, SUPA_KEY)

def gni_get(path):
    res = requests.get(GNI_API + path,
        headers={'X-GNI-Key': GNI_KEY, 'X-Client': 'myanmar-pipeline-v1'},
        timeout=30)
    res.raise_for_status()
    return res.json()

def groq_gen(api_key, prompt, max_tokens=400):
    resp = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': GROQ_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': max_tokens,
            'temperature': 0.3,
        },
        timeout=60
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content'].strip()

def tg_send(text):
    if not TG_TOKEN:
        log('  WARNING: No TG_TOKEN'); return
    try:
        requests.post(
            f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage',
            json={'chat_id':TG_CHANNEL,'text':text,
                  'parse_mode':'HTML','disable_web_page_preview':True},
            timeout=15)
        log('  OK: Telegram sent')
        time.sleep(1)
    except Exception as e:
        log(f'  WARNING: Telegram: {e}')

def esc_emoji(level):
    return {'CRITICAL':'🔴','HIGH':'🟠','ELEVATED':'🟡',
            'MODERATE':'🔵','LOW':'🟢'}.get((level or '').upper(),'⚪')

def run():
    start = datetime.now(timezone.utc)
    run_date = start.date()
    run_ts   = start.isoformat()
    groq_tokens = 0

    log('='*60)
    log('GNI Myanmar Intelligence Pipeline')
    log(f'Started: {start.strftime("%Y-%m-%d %H:%M:%S UTC")}')
    log('='*60)

    # Step 0: Freshness check
    log('\n-- Step 0: Freshness check --')
    try:
        latest = gni_get('/api/latest')
        raw_ts = (latest.get('created_at') or latest.get('timestamp','')).replace('Z','+00:00')
        if raw_ts:
            age_hrs = (start - datetime.fromisoformat(raw_ts)).total_seconds()/3600
            log(f'  Data age: {age_hrs:.1f}h')
            if age_hrs > FRESHNESS_HRS:
                log(f'  Not fresh -- exiting gracefully')
                sys.exit(0)
            log(f'  OK: Fresh data confirmed')
    except Exception as e:
        log(f'  WARNING: {e} -- proceeding anyway')

    # Connect
    log('\n-- Connecting --')
    try:
        groq = get_groq(); supa = get_supa()
        log('  OK: Groq + Supabase connected')
    except Exception as e:
        log(f'  ABORT: {e}'); sys.exit(1)

    # Step 1: Cleanup 365 days
    log('\n-- Step 1: Cleanup 365-day retention --')
    cutoff = (start - timedelta(days=365)).isoformat()
    for t in ['article_briefs','market_briefs','debate_summaries']:
        try:
            supa.table(t).delete().lt('created_at',cutoff).execute()
            log(f'  OK: {t} cleaned')
        except Exception as e:
            log(f'  WARNING: {t}: {e}')

    # Step 2: Fetch selected articles (geo-tagged)
    log('\n-- Step 2: Fetch selected articles --')
    try:
        ev_data = gni_get('/api/article-events')
        events = ev_data.get('events', ev_data.get('articles',[]))
        log(f'  OK: {len(events)} selected articles')
    except Exception as e:
        log(f'  ABORT: {e}'); sys.exit(1)

    # Step 3: Generate Myanmar briefs
    log('\n-- Step 3: Generate Myanmar article briefs --')
    article_rows = []
    for i,ev in enumerate(events[:15]):
        title  = ev.get('title','')
        source = ev.get('source','')
        lat    = ev.get('lat')
        lng    = ev.get('lng')
        esc    = ev.get('escalation_score',0)
        url    = ev.get('url', ev.get('link',''))
        has_geo = lat is not None and lng is not None
        log(f'  [{i+1}] {title[:60]}')
        try:
            brief = groq_gen(groq,
                f"Article: {title}\nSource: {source}\nEscalation: {esc}/10\n\n"
                f"Write exactly 10 sentences in Myanmar language (Unicode Myanmar script) "
                f"explaining this news, why it matters for Myanmar and ASEAN, and the "
                f"geopolitical implications. Write clearly for general readers. "
                f"Myanmar Unicode only.", 600)
            groq_tokens += 600
            time.sleep(0.5)
        except Exception as e:
            log(f'    WARNING: {type(e).__name__}: {str(e)[:120]}'); brief = None
        article_rows.append({'run_date':str(run_date),'run_timestamp':run_ts,
            'article_title':title[:500],'url':url[:1000],'source':source[:100],
            'is_selected':True,'has_geo':has_geo,
            'lat':float(lat) if lat else None,'lng':float(lng) if lng else None,
            'escalation_score':float(esc) if esc else None,'myanmar_brief':brief})

    # Step 4: Fetch all collected articles
    log('\n-- Step 4: Fetch collected articles archive --')
    try:
        all_arts = gni_get('/api/export/articles').get('articles',[])
        selected_urls = {r['url'] for r in article_rows}
        for art in all_arts[:500]:
            u = art.get('url', art.get('link',''))
            if u not in selected_urls:
                article_rows.append({'run_date':str(run_date),'run_timestamp':run_ts,
                    'article_title':str(art.get('title',''))[:500],'url':str(u)[:1000],
                    'source':str(art.get('source',''))[:100],
                    'is_selected':False,'has_geo':False,'lat':None,'lng':None,
                    'escalation_score':None,'myanmar_brief':None})
        log(f'  OK: {len(article_rows)} total article rows')
    except Exception as e:
        log(f'  WARNING: {e}')

    # Step 5: Save article_briefs
    log('\n-- Step 5: Save article_briefs --')
    try:
        for i in range(0,len(article_rows),50):
            supa.table('article_briefs').insert(article_rows[i:i+50]).execute()
        log(f'  OK: {len(article_rows)} rows saved')
    except Exception as e:
        log(f'  ERROR: {e}')

    # Step 6: Fetch latest report
    log('\n-- Step 6: Fetch latest report --')
    try:
        rep = gni_get('/api/reports').get('reports',[])[0]
        esc_score = rep.get('escalation_score',0)
        esc_level = rep.get('escalation_level','UNKNOWN')
        mad_verd  = rep.get('mad_verdict','')
        mad_conf  = rep.get('mad_confidence',0)
        mad_act   = rep.get('mad_action_recommendation','')
        mad_blind = rep.get('mad_blind_spot','')
        mad_black = rep.get('mad_black_swan_case','')
        mad_ostr  = rep.get('mad_ostrich_case','')
        short_thr = rep.get('short_focus_threats','')
        long_thr  = rep.get('long_shoot_threats','')
        plain_nar = rep.get('plain_narrative','')
        mkt_imp   = rep.get('market_impact','')
        ci_width  = rep.get('confidence_interval_width', rep.get('ci_width', 0))
        rep_id    = rep.get('id','')
        log(f'  OK: {esc_score}/10 {esc_level} | {mad_verd} {round((mad_conf or 0)*100)}%')
    except Exception as e:
        log(f'  WARNING: {e}')
        esc_score=0;esc_level='UNKNOWN';mad_verd='';mad_conf=0
        mad_act='';mad_blind='';mad_black='';mad_ostr=''
        short_thr='';long_thr='';plain_nar='';mkt_imp='';ci_width=0;rep_id=''

    # Step 7: Fetch pillars + pipeline runs
    log('\n-- Step 7: Fetch pillars --')
    geo_p={};tech_p={};fin_p={}
    try:
        for p in gni_get('/api/pillar-reports').get('pillars',[]):
            n=(p.get('pillar') or p.get('name','')).upper()
            if 'GEO' in n: geo_p=p
            elif 'TECH' in n: tech_p=p
            elif 'FIN' in n: fin_p=p
        log('  OK: Pillars loaded')
    except Exception as e:
        log(f'  WARNING: {e}')

    funnel_collected=425; funnel_selected=11
    try:
        runs = gni_get('/api/pipeline-runs').get('runs',[{}])
        funnel_collected = runs[0].get('articles_collected',425)
        funnel_selected  = runs[0].get('top_articles_count',11)
        log(f'  OK: Funnel {funnel_collected} -> {funnel_selected}')
    except Exception as e:
        log(f'  WARNING: {e}')

    # Step 8: Generate Myanmar content
    log('\n-- Step 8: Generate Myanmar intel content --')
    certainty = round((1-(ci_width or 0)/1.6)*100)

    def gen(label, prompt, mt=300):
        nonlocal groq_tokens
        log(f'  Generating: {label}...')
        try:
            r = groq_gen(groq, prompt, mt)
            groq_tokens += mt
            time.sleep(0.5)
            return r
        except Exception as e:
            log(f'    WARNING: {type(e).__name__}: {str(e)[:120]}'); return None

    funnel_mm = gen('Funnel',
        f"GNI collected {funnel_collected} articles from 25 sources, selected best {funnel_selected}. "
        f"Write 3-5 sentences Myanmar language explaining the intelligence funnel process "
        f"and why only the most relevant articles are selected. Myanmar Unicode only.")

    primary_mm = gen('Primary+CI',
        f"Escalation: {esc_score}/10 ({esc_level}). Certainty: {certainty}%. "
        f"Summary: {plain_nar[:400]}\n\n"
        f"Write 3-5 sentences Myanmar language summarizing primary analysis and "
        f"what {certainty}% certainty means. Myanmar Unicode only.")

    geo_mm = gen('GEO',
        f"GEO pillar: {json.dumps(geo_p)[:600]}\n\n"
        f"Write 3-5 sentences Myanmar language on geopolitical findings "
        f"relevant to Myanmar and ASEAN. Myanmar Unicode only.")

    tech_mm = gen('TECH',
        f"TECH pillar: {json.dumps(tech_p)[:600]}\n\n"
        f"Write 3-5 sentences Myanmar language on technology/cyber findings. Myanmar Unicode only.")

    fin_mm = gen('FIN',
        f"FIN pillar: {json.dumps(fin_p)[:600]}\n\n"
        f"Write 3-5 sentences Myanmar language on financial findings, "
        f"oil, gold, currency impact on Myanmar. Myanmar Unicode only.")

    mad_mm = gen('MAD narrative',
        f"Verdict: {mad_verd} ({round((mad_conf or 0)*100)}%)\n"
        f"Action: {mad_act[:300]}\nBlind spot: {mad_blind[:200]}\n"
        f"Black swan: {mad_black[:200]}\nOstrich: {mad_ostr[:200]}\n"
        f"Short threats: {short_thr[:200]}\nLong threats: {long_thr[:200]}\n\n"
        f"Write 15-20 sentences Myanmar language as flowing narrative covering the "
        f"4-agent debate conclusion, action awareness, key risks, blind spot, extreme scenarios. "
        f"Myanmar Unicode only.", 1500)

    brief_mm = gen('30-sec brief',
        f"Escalation: {esc_score}/10 {esc_level}. MAD: {mad_verd} {round((mad_conf or 0)*100)}%.\n"
        f"Key: {plain_nar[:300] or mkt_imp[:300]}\n\n"
        f"Write exactly 3-4 sentences Myanmar language as 30-second intelligence brief. "
        f"Start with most important fact. Direct and clear. Myanmar Unicode only.", 400)

    # Step 9: Save debate_summaries
    log('\n-- Step 9: Save debate_summaries --')
    try:
        supa.table('debate_summaries').insert({
            'run_date':str(run_date),'run_timestamp':run_ts,'report_id':rep_id,
            'mad_verdict':mad_verd,'mad_confidence':float(mad_conf) if mad_conf else None,
            'escalation_score':float(esc_score) if esc_score else None,
            'escalation_level':esc_level,
            'funnel_mm':funnel_mm,'primary_mm':primary_mm,
            'geo_mm':geo_mm,'tech_mm':tech_mm,'fin_mm':fin_mm,
            'mad_mm':mad_mm,'brief_mm':brief_mm,
            'pipeline_success':True,'groq_tokens_used':groq_tokens
        }).execute()
        log(f'  OK: debate_summaries saved')
    except Exception as e:
        log(f'  ERROR: {e}')

    # Step 10: Market briefs
    log('\n-- Step 10: Market briefs --')
    for cat,ctx in [
        ('Commodity',f'Oil and gold context: {mkt_imp[:300]}'),
        ('Forex',    f'Currency/USD/kyat context: {mkt_imp[:300]}'),
        ('Equity',   f'Stock market context: {mkt_imp[:300]}'),
    ]:
        mm = gen(f'{cat}',
            f"{ctx}\nWrite 4-6 sentences Myanmar language about {cat} markets "
            f"and Myanmar implications. Myanmar Unicode only.", 500)
        try:
            supa.table('market_briefs').insert({
                'run_date':str(run_date),'run_timestamp':run_ts,
                'category':cat,'myanmar_brief':mm or ''}).execute()
            log(f'  OK: {cat} saved')
        except Exception as e:
            log(f'  ERROR: {cat}: {e}')

    # Step 11: Export to Supabase Storage
    log('\n-- Step 11: Export CSV/JSON to Storage --')
    try:
        reps = gni_get('/api/export/reports').get('reports',[])
        if reps:
            buf = io.StringIO()
            csv.DictWriter(buf, fieldnames=reps[0].keys()).writeheader()
            csv.DictWriter(buf, fieldnames=reps[0].keys()).writerows(reps)
            supa.storage.from_('gni-myanmar-exports').upload(
                'reports.csv', buf.getvalue().encode('utf-8'),
                {'content-type':'text/csv','upsert':'true'})
            supa.storage.from_('gni-myanmar-exports').upload(
                'reports.json',
                json.dumps(reps,ensure_ascii=False).encode('utf-8'),
                {'content-type':'application/json','upsert':'true'})
            log(f'  OK: reports.csv + reports.json uploaded')
    except Exception as e:
        log(f'  WARNING: Export: {e}')

    # Step 12: Summary
    elapsed = round((datetime.now(timezone.utc)-start).total_seconds(),2)
    log(f'\n-- Done: {elapsed}s | {groq_tokens} tokens --')

    # Step 13: Telegram
    log('\n-- Step 13: Telegram notifications --')
    emoji = esc_emoji(esc_level)
    conf_pct = round((mad_conf or 0)*100)

    tg_send(
        f"{emoji} <b>GNI Myanmar | {esc_level} {esc_score}/10</b>\n\n"
        f"MAD စီရင်ချက်: <b>{mad_verd.upper()}</b> ({conf_pct}% ယုံကြည်မှု)\n\n"
        f"{brief_mm or 'ကမ္ဘာ့အနေအထားကို GNI မှ ခွဲခြမ်းစိတ်ဖြာနေသည်။'}\n\n"
        f"📊 <a href='https://gni-myanmar.vercel.app'>Dashboard</a> | "
        f"📰 <a href='https://gni-myanmar.vercel.app/news'>News</a> | "
        f"⚔️ <a href='https://gni-myanmar.vercel.app/intel'>Intel</a>\n\n"
        f"#GNI #Myanmar #GlobalIntelligence"
    )

    selected = [r for r in article_rows if r['is_selected']]
    def arts_msg(arts, label):
        lines = [f"<b>ယနေ့ GNI ရွေးချယ်သော သတင်းများ {label}</b>\n"]
        for i,a in enumerate(arts,1):
            brief2 = ''
            if a.get('myanmar_brief'):
                ss = a['myanmar_brief'].split('။')
                brief2 = '။'.join(ss[:2])+'။' if len(ss)>=2 else a['myanmar_brief'][:200]
            lines.append(f"{i}. <b>[{a.get('source','')}]</b> {a.get('article_title','')[:80]}")
            if a.get('url'): lines.append(f"   🔗 {a['url']}")
            if brief2: lines.append(f"   {brief2}")
            lines.append('')
        return '\n'.join(lines)

    if selected: tg_send(arts_msg(selected[:6], '(၁-၆)'))
    if len(selected) > 6: tg_send(arts_msg(selected[6:], '(၇-၁၁)'))

    log('='*60)
    log('GNI Myanmar Pipeline: SUCCESS')
    log('='*60)
    return True

if __name__ == '__main__':
    sys.exit(0 if run() else 1)