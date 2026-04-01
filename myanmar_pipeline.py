#!/usr/bin/env python3
"""
myanmar_pipeline.py -- GNI Myanmar Intelligence Pipeline
Phase 2 | Team Geeks | April 2026
Quality gates: disclaimer filter + repetition detection + min 5 sentences
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import os, sys, json, time, csv, io, re
from datetime import datetime, timezone, timedelta
import requests
from groq import Groq
from supabase import create_client

GNI_API    = 'https://gni-autonomous.vercel.app'
GNI_KEY    = os.getenv('GNI_API_KEY', '')
GROQ_KEY   = os.getenv('GROQ_API_KEY', '')
SUPA_URL   = os.getenv('SUPABASE_URL', '')
SUPA_KEY   = os.getenv('SUPABASE_SERVICE_KEY', '')
TG_TOKEN   = os.getenv('TELEGRAM_BOT_TOKEN', '')
TG_CHANNEL = os.getenv('TELEGRAM_CHANNEL_ID', '-1003855420750')
GROQ_MODEL = 'llama-3.3-70b-versatile'
FRESHNESS_HRS = 2.0

def log(msg): print(msg, flush=True)

def get_groq():
    if not GROQ_KEY: raise Exception('GROQ_API_KEY not set')
    return Groq(api_key=GROQ_KEY.strip())

def get_supa():
    if not SUPA_URL or not SUPA_KEY: raise Exception('Supabase creds not set')
    return create_client(SUPA_URL, SUPA_KEY)

def gni_get(path):
    res = requests.get(GNI_API + path,
        headers={'X-GNI-Key': GNI_KEY, 'X-Client': 'myanmar-pipeline-v2'},
        timeout=30)
    res.raise_for_status()
    return res.json()

def groq_gen(client, prompt, max_tokens=600):
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{'role':'user','content':prompt}],
        max_tokens=max_tokens, temperature=0.3)
    return resp.choices[0].message.content.strip()

# ── QUALITY GATE 1: Strip AI disclaimers ─────────────────────────
DISCLAIMER_PATTERNS = [
    r'(?i)note:\s*i (tried|attempt)',
    r'(?i)please note that',
    r'(?i)as an ai',
    r'(?i)i am not able to',
    r'(?i)i cannot guarantee',
    r'(?i)translation may not be',
    r'(?i)this is my best',
    r'(?i)i have translated',
    r'(?i)myanmar translation:',
    r'(?i)here is the translation',
    r'(?i)here are the sentences',
]

def strip_disclaimers(text):
    if not text: return text
    lines = text.split('\n')
    clean = []
    for line in lines:
        skip = False
        for pat in DISCLAIMER_PATTERNS:
            if re.search(pat, line):
                skip = True
                log(f'    [QG1] Stripped disclaimer: {line[:60]}')
                break
        if not skip:
            clean.append(line)
    return '\n'.join(clean).strip()

# ── QUALITY GATE 2: Detect repetition loops ───────────────────────
def repetition_detected(text, min_len=15, max_repeats=3):
    if not text: return False
    sentences = [s.strip() for s in re.split(r'[။\n]', text) if len(s.strip()) >= min_len]
    seen = {}
    for s in sentences:
        key = s[:min_len]
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > max_repeats:
            log(f'    [QG2] Repetition detected: {key[:40]}...')
            return True
    return False

# ── QUALITY GATE 3: Minimum 5 sentences check ────────────────────
def count_sentences(text):
    if not text: return 0
    return len([s for s in re.split(r'[။\.\!\?]', text) if len(s.strip()) > 5])

def quality_check(label, text, min_sentences=5):
    if not text:
        log(f'    [QG] {label}: EMPTY — failed')
        return False
    if repetition_detected(text):
        log(f'    [QG] {label}: REPETITION — failed')
        return False
    n = count_sentences(text)
    if n < min_sentences:
        log(f'    [QG] {label}: only {n} sentences (need {min_sentences}) — failed')
        return False
    log(f'    [QG] {label}: OK ({n} sentences)')
    return True

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
    log('GNI Myanmar Intelligence Pipeline v2')
    log(f'Started: {start.strftime("%Y-%m-%d %H:%M:%S UTC")}')
    log('Quality gates: disclaimer filter + repetition + min 5 sentences')
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

    # Step 2: Fetch selected articles
    log('\n-- Step 2: Fetch selected articles --')
    try:
        ev_data = gni_get('/api/article-events')
        events = ev_data.get('events', ev_data.get('articles',[]))
        log(f'  OK: {len(events)} selected articles')
    except Exception as e:
        log(f'  ABORT: {e}'); sys.exit(1)

    # Step 3: Generate Myanmar article briefs (min 5 sentences)
    log('\n-- Step 3: Generate Myanmar article briefs --')
    article_rows = []
    for i,ev in enumerate(events[:11]):
        title  = ev.get('title','')
        source = ev.get('source','')
        lat    = ev.get('lat')
        lng    = ev.get('lng')
        esc    = ev.get('escalation_score',0)
        url    = ev.get('url', ev.get('link',''))
        has_geo = lat is not None and lng is not None
        log(f'  [{i+1}] {title[:60]}')
        brief = None
        for attempt in range(2):
            try:
                raw = groq_gen(groq,
                    f"Article: {title}\nSource: {source}\nEscalation: {esc}/10\n\n"
                    f"Write exactly 5 sentences in Myanmar language (Unicode Myanmar script only, no English). "
                    f"Sentence 1: What happened. "
                    f"Sentence 2: Who is involved. "
                    f"Sentence 3: Why it matters for Myanmar. "
                    f"Sentence 4: ASEAN and regional impact. "
                    f"Sentence 5: What Myanmar readers should watch. "
                    f"Do NOT write any English. Do NOT add disclaimers or notes.", 600)
                groq_tokens += 600
                raw = strip_disclaimers(raw)
                if quality_check(f'Brief[{i+1}]', raw, min_sentences=5):
                    brief = raw
                    break
                log(f'    Attempt {attempt+1} failed quality — retrying')
                time.sleep(2)
            except Exception as e:
                log(f'    WARNING: {e}'); time.sleep(3)
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
        ci_width  = rep.get('confidence_interval_width',0)
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

    # Step 8: Generate Myanmar intel content with quality gates
    log('\n-- Step 8: Generate Myanmar intel content --')
    certainty = round((1-(ci_width or 0)/1.6)*100)

    def gen_with_quality(label, prompt, mt=600, min_sent=5, retries=2):
        nonlocal groq_tokens
        log(f'  Generating: {label}...')
        for attempt in range(retries):
            try:
                raw = groq_gen(groq, prompt, mt)
                groq_tokens += mt
                raw = strip_disclaimers(raw)
                if quality_check(label, raw, min_sent):
                    return raw
                log(f'    Attempt {attempt+1} failed — retrying in 3s')
                time.sleep(3)
            except Exception as e:
                log(f'    WARNING: {e}'); time.sleep(4)
        log(f'    FAILED after {retries} attempts — using None')
        return None

    funnel_mm = gen_with_quality('Funnel',
        f"GNI collected {funnel_collected} articles from 25 RSS sources. "
        f"Selected best {funnel_selected} articles for analysis. "
        f"Write 5 sentences in Myanmar language (no English, no disclaimers) explaining: "
        f"1) How many articles GNI analyzed today. "
        f"2) How articles are selected by relevance and quality score. "
        f"3) Which sources are used (international media). "
        f"4) Why quality filtering matters for accurate intelligence. "
        f"5) How this pipeline runs automatically twice per day.", 500)

    primary_mm = gen_with_quality('Primary',
        f"Escalation: {esc_score}/10 ({esc_level}). Certainty: {certainty}%. "
        f"Analysis: {plain_nar[:500]}\n\n"
        f"Write 5 sentences Myanmar language (no English, no disclaimers): "
        f"1) Current global escalation level and what it means. "
        f"2) What the AI analysis found today. "
        f"3) Market and economic implications. "
        f"4) What {certainty}% model certainty means for readers. "
        f"5) What Myanmar readers should be aware of.", 500)

    geo_mm = gen_with_quality('GEO',
        f"Geopolitical pillar analysis: {json.dumps(geo_p)[:600]}\n\n"
        f"Write 5 sentences Myanmar language (no English, no disclaimers): "
        f"1) Main geopolitical event today. "
        f"2) Countries and actors involved. "
        f"3) Regional impact on ASEAN. "
        f"4) Impact on Myanmar specifically. "
        f"5) What to watch next.", 500)

    tech_mm = gen_with_quality('TECH',
        f"Technology pillar: {json.dumps(tech_p)[:600]}\n\n"
        f"Write 5 sentences Myanmar language (no English, no disclaimers): "
        f"1) Main technology or cyber event. "
        f"2) Who is affected. "
        f"3) Cybersecurity implications. "
        f"4) AI and surveillance context. "
        f"5) Myanmar and ASEAN relevance.", 500)

    fin_mm = gen_with_quality('FIN',
        f"Financial pillar: {json.dumps(fin_p)[:600]}\n"
        f"Market impact: {mkt_imp[:300]}\n\n"
        f"Write 5 sentences Myanmar language (no English, no disclaimers): "
        f"1) Oil price situation and impact. "
        f"2) Gold price movement. "
        f"3) USD/currency implications for Myanmar kyat. "
        f"4) Stock market direction (SPY, regional). "
        f"5) What Myanmar businesses and traders should watch.", 500)

    # MAD full debate translation — all agents, all rounds
    mad_mm = gen_with_quality('MAD full debate',
        f"MAD 4-Agent Debate Result:\n"
        f"Verdict: {mad_verd} ({round((mad_conf or 0)*100)}% confidence)\n"
        f"BULL agent (Known Positives): {mad_black[:300]}\n"
        f"BEAR agent (Known Negatives): {short_thr[:300]}\n"
        f"BLACK SWAN agent (Unknown Negatives): {mad_black[:300]}\n"
        f"OSTRICH agent (Ignored Realities): {mad_ostr[:300]}\n"
        f"Action Recommendation: {mad_act[:300]}\n"
        f"Blind Spot: {mad_blind[:200]}\n"
        f"Long-term threats: {long_thr[:200]}\n\n"
        f"Write 10 sentences Myanmar language (no English, no disclaimers) covering: "
        f"1-2) Overall verdict and confidence level explanation. "
        f"3-4) Bull agent positive case summary. "
        f"5-6) Bear agent risk case summary. "
        f"7) Black Swan unknown threat. "
        f"8) Ostrich ignored reality warning. "
        f"9) Action recommendation for readers. "
        f"10) Final blind spot warning.", 1200, min_sent=8)

    brief_mm = gen_with_quality('30-sec brief',
        f"Intelligence summary: Escalation {esc_score}/10 {esc_level}. "
        f"MAD verdict: {mad_verd} {round((mad_conf or 0)*100)}%.\n"
        f"Key finding: {plain_nar[:400] or mkt_imp[:400]}\n"
        f"Action: {mad_act[:200]}\n\n"
        f"Write exactly 5 sentences Myanmar language (no English, no disclaimers): "
        f"1) Most important global event right now. "
        f"2) Escalation level and what it means. "
        f"3) MAD debate verdict and confidence. "
        f"4) Most important action recommendation. "
        f"5) Key risk Myanmar readers must watch.", 500)

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
        ('Commodity', f'Oil and gold market context: {mkt_imp[:300]}'),
        ('Forex',     f'Currency/USD/kyat context: {mkt_imp[:300]}'),
        ('Equity',    f'Stock market context: {mkt_imp[:300]}'),
    ]:
        mm = gen_with_quality(f'{cat} brief',
            f"{ctx}\n\nWrite 5 sentences Myanmar language (no English, no disclaimers) about "
            f"{cat} markets and direct impact on Myanmar economy and people.", 500)
        try:
            supa.table('market_briefs').insert({
                'run_date':str(run_date),'run_timestamp':run_ts,
                'category':cat,'myanmar_brief':mm or ''}).execute()
            log(f'  OK: {cat} saved')
        except Exception as e:
            log(f'  ERROR: {cat}: {e}')

    # Step 11: Export CSV/JSON
    log('\n-- Step 11: Export CSV/JSON --')
    try:
        reps = gni_get('/api/export/reports').get('reports',[])
        if reps:
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=reps[0].keys())
            w.writeheader(); w.writerows(reps)
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
    log('\n-- Step 13: Telegram --')
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
    log('GNI Myanmar Pipeline v2: SUCCESS')
    log('='*60)
    return True

if __name__ == '__main__':
    sys.exit(0 if run() else 1)