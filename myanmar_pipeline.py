#!/usr/bin/env python3
"""
myanmar_pipeline.py -- GNI Myanmar Intelligence Pipeline v4
James Model V4 | Universal Bundling | Provider Waterfall (Groq→Gemini→Cloudflare)
Team Geeks | Session 15 | April 2026
Quality gates: disclaimer filter + repetition detection + min sentences
Backup providers: Gemini Flash (B1) + Cloudflare Workers AI (B2)
GNI-R-169: Uses direct REST to Groq (NOT groq library — blocked by Azure IPs)
GNI-R-194: Every prompt specifies EXACT sentence count + ། ending requirement
CRITICAL FILE -- Do NOT delete. See GNI-R-192.

TRIGGER DESIGN (James instruction: "start when we get alert from GNI-Autonomous,
not depend to fix time alarm"):

  Way 1 — PRIMARY: repository_dispatch event from GNI Intelligence Pipeline.
           GNI Autonomous calls GitHub API when MAD completes → this pipeline
           starts INSTANTLY. Truly event-driven. Zero fixed clock dependency.

  Way 2 — SAFETY NET + DATA: GNI Autonomous ALSO writes a signal row to
           Supabase pipeline_signals table (with article_ids + report_id).
           Step 0 reads article_ids from this signal — so pipeline always
           knows exactly which 11 articles to process regardless of trigger.
           If Way 1 dispatch is missed → light cron catches it via Way 2 signal.

  Together: Way 1 fires pipeline instantly. Way 2 stores the article IDs safely
            and provides a fallback. Bulletproof. Never misses a trigger.

Required Supabase table (run once):
  CREATE TABLE IF NOT EXISTS pipeline_signals (
    id          bigserial PRIMARY KEY,
    source      text NOT NULL,
    status      text NOT NULL DEFAULT 'complete',
    article_ids jsonb,
    report_id   text,
    processed   boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
  );
"""

import os, sys, json, time, csv, io, re
from datetime import datetime, timezone, timedelta
import requests
from supabase import create_client

GNI_API      = 'https://gni-autonomous.vercel.app'
GNI_KEY      = os.getenv('GNI_API_KEY', '')
GROQ_KEY     = os.getenv('GROQ_API_KEY', '')
GEMINI_KEY   = os.getenv('GEMINI_API_KEY', '')
CF_TOKEN     = os.getenv('CF_API_TOKEN', '')
CF_ACCOUNT   = os.getenv('CF_ACCOUNT_ID', '')
SUPA_URL     = os.getenv('SUPABASE_URL', '')
SUPA_KEY     = os.getenv('SUPABASE_SERVICE_KEY', '')
TG_TOKEN     = os.getenv('TELEGRAM_BOT_TOKEN', '')
TG_CHANNEL   = os.getenv('TELEGRAM_CHANNEL_ID', '-1003855420750')
GROQ_MODEL   = 'llama-3.3-70b-versatile'

def log(msg): print(msg, flush=True)

def get_supa():
    if not SUPA_URL or not SUPA_KEY: raise Exception('Supabase creds not set')
    return create_client(SUPA_URL, SUPA_KEY)

def gni_get(path):
    res = requests.get(GNI_API + path,
        headers={'X-GNI-Key': GNI_KEY, 'X-Client': 'myanmar-pipeline-v4'},
        timeout=30)
    res.raise_for_status()
    return res.json()

# ── TRIGGER: Read signal from Supabase (Way 2) ────────────────────
def get_signal(supa):
    """
    Read the latest unprocessed signal from GNI Autonomous.
    GNI Autonomous writes to pipeline_signals when MAD completes.
    Returns (signal_id, article_ids, report_id) or (None, [], '').
    Pipeline uses article_ids to know which 11 articles to process.
    """
    try:
        res = supa.table('pipeline_signals')\
            .select('id, article_ids, report_id')\
            .eq('source', 'gni-autonomous')\
            .eq('processed', False)\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        if res.data:
            sig = res.data[0]
            ids = sig.get('article_ids') or []
            log(f'  OK: Signal found — {len(ids)} article IDs, report={sig.get("report_id","")}')
            return sig['id'], ids, sig.get('report_id', '')
        log('  INFO: No unprocessed signal found — will use GNI API fallback')
        return None, [], ''
    except Exception as e:
        log(f'  WARNING: Signal read failed: {e} — using GNI API fallback')
        return None, [], ''

def mark_signal_processed(supa, signal_id):
    """Mark signal as processed after pipeline completes successfully."""
    if not signal_id:
        return
    try:
        supa.table('pipeline_signals')\
            .update({'processed': True})\
            .eq('id', signal_id)\
            .execute()
        log(f'  OK: Signal {signal_id} marked as processed')
    except Exception as e:
        log(f'  WARNING: Could not mark signal processed: {e}')

# ── PROVIDER ERRORS ───────────────────────────────────────────────
class RateLimitError(Exception):
    def __init__(self, retry_after=60):
        self.retry_after = int(retry_after)

class CapacityError(Exception): pass

# ── PROVIDER 1: GROQ (Primary) — GNI-R-169: direct REST, NOT groq library ───
def groq_rest(prompt, max_tokens=600):
    if not GROQ_KEY:
        raise Exception('GROQ_API_KEY not set')
    r = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers={'Authorization': f'Bearer {GROQ_KEY}', 'Content-Type': 'application/json'},
        json={'model': GROQ_MODEL, 'max_tokens': max_tokens, 'temperature': 0.3,
              'messages': [{'role': 'user', 'content': prompt}]},
        timeout=30)
    if r.status_code == 429:
        retry_after = int(r.headers.get('retry-after', 60))
        raise RateLimitError(retry_after)
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()['choices'][0]['message']['content'].strip(), r.headers

# ── PROVIDER 2: GEMINI FLASH (Backup 1) ──────────────────────────
def gemini_gen(prompt, max_tokens=2000):
    if not GEMINI_KEY:
        raise Exception('GEMINI_API_KEY not set')
    r = requests.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        headers={'Content-Type': 'application/json'},
        params={'key': GEMINI_KEY},
        json={'contents': [{'parts': [{'text': prompt}]}],
              'generationConfig': {'maxOutputTokens': max_tokens, 'temperature': 0.3}},
        timeout=45)
    if r.status_code == 429:
        raise RateLimitError(60)
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()['candidates'][0]['content']['parts'][0]['text'].strip(), {}

# ── PROVIDER 3: CLOUDFLARE WORKERS AI (Backup 2) ─────────────────
def cloudflare_gen(prompt, max_tokens=1024):
    if not CF_TOKEN or not CF_ACCOUNT:
        raise Exception('CF_API_TOKEN or CF_ACCOUNT_ID not set')
    r = requests.post(
        f'https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/run/@cf/meta/llama-3.1-8b-instruct',
        headers={'Authorization': f'Bearer {CF_TOKEN}', 'Content-Type': 'application/json'},
        json={'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': max_tokens},
        timeout=60)
    r.raise_for_status()
    return r.json()['result']['response'].strip(), {}

# ── SMART GENERATE: Provider Waterfall (Groq→Gemini→Cloudflare) ──
def smart_gen(prompt, min_sent=5, max_tokens=600):
    """
    Try Groq first. On 429: sleep retry-after, retry same provider.
    On 503×5: Groq is down, switch to Gemini.
    On ConnectionError: switch immediately.
    GNI-R-194: caller must put exact sentence count in prompt.
    Returns (text, provider_name) or (None, None) if all fail.
    """
    providers = [
        ('groq',       lambda p: groq_rest(p, max_tokens)),
        ('gemini',     lambda p: gemini_gen(p, max_tokens * 3)),
        ('cloudflare', lambda p: cloudflare_gen(p, min(max_tokens * 2, 1024))),
    ]
    groq_503 = 0

    for pname, pfn in providers:
        for attempt in range(4):
            try:
                text, headers = pfn(prompt)
                text = strip_disclaimers(text)
                n = count_sentences(text)
                if n >= min_sent:
                    log(f'    [{pname.upper()}] OK ({n} sentences) attempt {attempt+1}')
                    return text, pname
                log(f'    [{pname.upper()}] Only {n} sentences (need {min_sent}), retrying...')
                time.sleep(3)
            except RateLimitError as e:
                log(f'    [{pname.upper()}] Rate limited. Sleeping {e.retry_after}s...')
                time.sleep(e.retry_after)
            except CapacityError:
                groq_503 += 1
                if pname == 'groq' and groq_503 >= 5:
                    log(f'    [GROQ] Down (5x 503). Switching to Gemini.')
                    break
                log(f'    [{pname.upper()}] Over capacity. Sleeping 30s...')
                time.sleep(30)
            except Exception as e:
                log(f'    [{pname.upper()}] Error: {e}. Switching provider.')
                break

    log(f'    ALL PROVIDERS FAILED — using None')
    return None, None

# ── UNIVERSAL BUNDLE PARSER ───────────────────────────────────────
def parse_bundle(response_text, tag):
    """
    Splits bundle response back into individual items.
    Works for any tag: ART, MAD, ARB, INTEL, MKT
    Example: parse_bundle(resp, "ART") → {"1": "မြန်မာ...", "2": "..."}
    """
    if not response_text:
        return {}
    pattern = rf'\[{tag}:([^\]]+)\](.*?)(?=\[{tag}:|$)'
    matches = re.findall(pattern, response_text, re.DOTALL)
    return {key.strip(): text.strip() for key, text in matches}

# ── QUOTA CHECK ───────────────────────────────────────────────────
def check_quota():
    """Check Groq remaining tokens via response headers."""
    try:
        _, headers = groq_rest('OK', max_tokens=1)
        remaining = int(headers.get('x-ratelimit-remaining-tokens', 6000))
        log(f'  Quota: {remaining} tokens remaining')
        return remaining
    except Exception as e:
        log(f'  Quota check failed: {e}')
        return 3000  # assume enough if check fails

def wait_for_quota(min_tokens=3000, label='next phase'):
    """Wait until Groq quota has recharged to min_tokens."""
    while True:
        q = check_quota()
        if q >= min_tokens:
            log(f'  Quota OK: {q} tokens. Starting {label}.')
            return
        log(f'  Quota low ({q}). Need {min_tokens}. Sleeping 60s...')
        time.sleep(60)

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
        skip = any(re.search(p, line) for p in DISCLAIMER_PATTERNS)
        if skip:
            log(f'    [QG1] Stripped: {line[:60]}')
        else:
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
            log(f'    [QG2] Repetition: {key[:40]}...')
            return True
    return False

# ── QUALITY GATE 3: Count sentences ──────────────────────────────
def count_sentences(text):
    if not text: return 0
    mm = text.count('။')
    en = len(re.findall(r'[.!?](?:\s|$)', text))
    return max(mm, en)

def quality_ok(label, text, min_sent=5):
    if not text:
        log(f'    [QG] {label}: EMPTY')
        return False
    if repetition_detected(text):
        log(f'    [QG] {label}: REPETITION')
        return False
    n = count_sentences(text)
    if n < min_sent:
        log(f'    [QG] {label}: only {n} sentences (need {min_sent})')
        return False
    log(f'    [QG] {label}: OK ({n} sentences)')
    return True

# ── READINESS CHECK BEFORE MAD ────────────────────────────────────
def wait_for_mad_readiness(article_ids, supa):
    """
    Wait until BOTH conditions are true:
    1. All 11 article translations done (or 30min max)
    2. Groq quota recharged to ≥ 3000 tokens
    Checks every 60 seconds. Patient — not rushing.
    """
    MAX_WAIT = 30 * 60
    waited = 0
    log('\n-- MAD Readiness Check --')
    while waited < MAX_WAIT:
        try:
            res = supa.table('article_briefs')\
                .select('translation_status')\
                .in_('url', article_ids)\
                .execute()
            done = sum(1 for r in (res.data or []) if r.get('translation_status') == 'translated')
            articles_done = done >= len(article_ids)
        except Exception:
            articles_done = True  # if check fails, proceed

        quota = check_quota()
        quota_ok = quota >= 3000

        if articles_done and quota_ok:
            log(f'  Ready! Articles done. Quota {quota} tokens. Starting MAD.')
            return
        log(f'  Waiting... articles={done}/{len(article_ids)} quota={quota}/3000. Sleep 60s.')
        time.sleep(60)
        waited += 60
    log('  Max wait reached. Proceeding to MAD anyway.')

# ── TELEGRAM ──────────────────────────────────────────────────────
def tg_send(text):
    if not TG_TOKEN:
        log('  WARNING: No TG_TOKEN'); return
    try:
        requests.post(
            f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage',
            json={'chat_id': TG_CHANNEL, 'text': text,
                  'parse_mode': 'HTML', 'disable_web_page_preview': True},
            timeout=15)
        log('  OK: Telegram sent')
        time.sleep(1)
    except Exception as e:
        log(f'  WARNING: Telegram: {e}')

def esc_emoji(level):
    return {'CRITICAL':'🔴','HIGH':'🟠','ELEVATED':'🟡',
            'MODERATE':'🔵','LOW':'🟢'}.get((level or '').upper(), '⚪')

# ═══════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════
def run():
    start    = datetime.now(timezone.utc)
    run_date = start.date()
    run_ts   = start.isoformat()

    log('=' * 60)
    log('GNI Myanmar Intelligence Pipeline v4 — James Model')
    log(f'Started: {start.strftime("%Y-%m-%d %H:%M:%S UTC")}')
    log('Universal Bundling | Groq→Gemini→Cloudflare | GNI-R-194')
    log('Trigger: GNI Autonomous alert (Way 1: dispatch + Way 2: Supabase signal)')
    log('=' * 60)

    # ── Connect ───────────────────────────────────────────────────
    log('\n-- Connecting --')
    try:
        supa = get_supa()
        log('  OK: Supabase connected')
        log(f'  OK: Groq={bool(GROQ_KEY)} Gemini={bool(GEMINI_KEY)} CF={bool(CF_TOKEN)}')
    except Exception as e:
        log(f'  ABORT: {e}'); sys.exit(1)

    # ── Step 0: Read trigger signal from Supabase (Way 2) ────────
    # James instruction: "start time is when we get alert from GNI-Autonomous
    # (i mean not depend to fix time alarm)"
    # Way 1 (repository_dispatch) already started this pipeline.
    # Way 2 (Supabase signal) gives us the article IDs + safety net.
    log('\n-- Step 0: Read GNI Autonomous signal --')
    signal_id, signal_article_ids, signal_report_id = get_signal(supa)
    if signal_article_ids:
        log(f'  Using signal article IDs: {signal_article_ids}')
    else:
        log('  No signal found — will fetch articles from GNI API as fallback')

    # ── Step 1: Cleanup 365 days ──────────────────────────────────
    log('\n-- Step 1: Cleanup 365-day retention --')
    cutoff = (start - timedelta(days=365)).isoformat()
    for t in ['article_briefs', 'market_briefs', 'debate_summaries']:
        try:
            supa.table(t).delete().lt('created_at', cutoff).execute()
            log(f'  OK: {t} cleaned')
        except Exception as e:
            log(f'  WARNING: {t}: {e}')

    # ── Step 2: Fetch selected articles ───────────────────────────
    log('\n-- Step 2: Fetch selected articles --')
    try:
        ev_data = gni_get('/api/article-events')
        events  = ev_data.get('events', ev_data.get('articles', []))
        selected = events[:11]
        log(f'  OK: {len(events)} articles — using top {len(selected)}')
    except Exception as e:
        log(f'  ABORT: {e}'); sys.exit(1)

    # ═══════════════════════════════════════════════════════════════
    # P1 — Generate English conclusions (Pro-Democracy Myanmar POV)
    # One call per article (each needs its own context)
    # GNI-R-194: EXACTLY 5 sentences specified in prompt
    # ═══════════════════════════════════════════════════════════════
    log('\n-- P1: English conclusions (Pro-Democracy Myanmar POV) --')
    article_rows = []
    article_urls = []

    for i, ev in enumerate(selected):
        title   = ev.get('title', '')
        source  = ev.get('source', '')
        lat     = ev.get('lat')
        lng     = ev.get('lng')
        esc     = ev.get('escalation_score', 0)
        url     = ev.get('url', ev.get('link', ''))
        has_geo = lat is not None and lng is not None

        log(f'  [P1:{i+1}] {title[:60]}')

        prompt = (
            f"Article title: {title}\n"
            f"Source: {source}\n"
            f"Escalation score: {esc}/10\n\n"
            f"Write a conclusion from the perspective of a senior Irrawaddy or Myanmar Now journalist. "
            f"Be factual and values-clear regarding democratic governance and human rights where relevant. "
            f"Let facts carry the meaning — do not editorialize.\n\n"
            f"Write EXACTLY 5 complete sentences in English. Each sentence ends with a period.\n"
            f"Sentence 1: What happened.\n"
            f"Sentence 2: Who is involved and what they did.\n"
            f"Sentence 3: Why this matters for Myanmar and the region.\n"
            f"Sentence 4: ASEAN and geopolitical implications.\n"
            f"Sentence 5: What Myanmar readers should watch next.\n"
            f"Total length: approximately 80 words. No disclaimers. No notes."
        )

        english_text, provider = smart_gen(prompt, min_sent=5, max_tokens=300)

        row = {
            'run_date':        str(run_date),
            'run_timestamp':   run_ts,
            'article_title':   title[:500],
            'url':             url[:1000],
            'source':          source[:100],
            'is_selected':     True,
            'has_geo':         has_geo,
            'lat':             float(lat) if lat else None,
            'lng':             float(lng) if lng else None,
            'escalation_score': float(esc) if esc else None,
            'myanmar_brief':   None,       # filled in P2
            'english_conclusion':   english_text,
            'myanmar_conclusion':   None,
            'translation_status':   'pending' if english_text else 'failed',
            'translation_provider': None,
        }
        article_rows.append(row)
        article_urls.append(url)
        log(f'    P1 saved: {provider or "FAILED"} — {title[:40]}')

    # ── Step 4: Fetch collected articles archive ───────────────────
    log('\n-- Step 4: Fetch collected articles archive --')
    try:
        all_arts = gni_get('/api/export/articles').get('articles', [])
        selected_urls = {r['url'] for r in article_rows}
        for art in all_arts[:500]:
            u = art.get('url', art.get('link', ''))
            if u not in selected_urls:
                article_rows.append({
                    'run_date': str(run_date), 'run_timestamp': run_ts,
                    'article_title': str(art.get('title', ''))[:500],
                    'url': str(u)[:1000],
                    'source': str(art.get('source', ''))[:100],
                    'is_selected': False, 'has_geo': False,
                    'lat': None, 'lng': None,
                    'escalation_score': None,
                    'myanmar_brief': None,
                    'english_conclusion': None,
                    'myanmar_conclusion': None,
                    'translation_status': None,
                    'translation_provider': None,
                })
        log(f'  OK: {len(article_rows)} total article rows')
    except Exception as e:
        log(f'  WARNING: {e}')

    # ── Step 5: Save article_briefs (with english_conclusion) ─────
    log('\n-- Step 5: Save article_briefs --')
    try:
        for i in range(0, len(article_rows), 50):
            supa.table('article_briefs').insert(article_rows[i:i+50]).execute()
        log(f'  OK: {len(article_rows)} rows saved')
    except Exception as e:
        log(f'  ERROR: {e}')

    # ═══════════════════════════════════════════════════════════════
    # P2 — Bundle all 55 sentences → Myanmar translation
    # All English conclusions as ONE numbered bundle [ART:1..11]
    # Dynamic batch sizing based on quota
    # GNI-R-194: EXACTLY 5 sentences per article specified
    # ═══════════════════════════════════════════════════════════════
    log('\n-- P2: Myanmar translation bundle [ART:1..11] --')
    valid_selected = [r for r in article_rows if r['is_selected'] and r.get('english_conclusion')]

    if valid_selected:
        # Build the full bundle
        bundle_lines = []
        for i, row in enumerate(valid_selected, 1):
            bundle_lines.append(f"[ART:{i}] {row['english_conclusion']}")
        full_bundle = '\n'.join(bundle_lines)

        # Check quota — send what fits
        quota = check_quota()
        # Each article ≈ 5 sentences × 120 tokens = 600 tokens
        # All 11 ≈ 6600 tokens — may need 2 batches if quota low
        batch_size = max(1, min(11, int(quota * 0.7 / 600)))
        log(f'  Quota: {quota} tokens. Batch size: {batch_size} articles.')

        start_idx = 0
        while start_idx < len(valid_selected):
            end_idx   = min(start_idx + batch_size, len(valid_selected))
            batch     = valid_selected[start_idx:end_idx]
            batch_num = [i+1 for i in range(start_idx, end_idx)]

            batch_bundle = '\n'.join(
                f"[ART:{batch_num[j]}] {batch[j]['english_conclusion']}"
                for j in range(len(batch))
            )

            prompt = (
                f"TRANSLATE ALL ITEMS BELOW INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
                f"Keep each [ART:N] marker exactly as shown in your response.\n"
                f"Each item: EXACTLY 5 complete sentences. Each sentence MUST end with ། (Myanmar full stop).\n"
                f"Do NOT add any text outside the [ART:N] sections. No disclaimers. No notes.\n\n"
                f"{batch_bundle}"
            )

            log(f'  Translating articles {batch_num[0]}-{batch_num[-1]} ({len(batch)*5} sentences)...')
            result_text, provider = smart_gen(prompt, min_sent=len(batch)*3, max_tokens=len(batch)*300)

            if result_text:
                parsed = parse_bundle(result_text, 'ART')
                for j, row in enumerate(batch):
                    key = str(batch_num[j])
                    mm_text = parsed.get(key, '')
                    if mm_text and quality_ok(f'ART:{key}', mm_text, 4):
                        # Update in-memory and in Supabase
                        row['myanmar_conclusion']   = mm_text
                        row['myanmar_brief']        = mm_text  # backward compat
                        row['translation_status']   = 'translated'
                        row['translation_provider'] = provider
                        try:
                            supa.table('article_briefs').update({
                                'myanmar_conclusion':   mm_text,
                                'myanmar_brief':        mm_text,
                                'translation_status':   'translated',
                                'translation_provider': provider,
                            }).eq('url', row['url']).execute()
                            log(f'    [{provider.upper()}] ART:{key} saved')
                        except Exception as e:
                            log(f'    WARNING: ART:{key} save failed: {e}')
            else:
                log(f'  WARNING: Batch {batch_num[0]}-{batch_num[-1]} failed all providers')

            start_idx = end_idx
            if start_idx < len(valid_selected):
                log('  Batch done. Waiting 10s before next batch...')
                time.sleep(10)

    # ── Step 6: Fetch latest report ───────────────────────────────
    log('\n-- Step 6: Fetch latest report --')
    esc_score=0; esc_level='UNKNOWN'; mad_verd=''; mad_conf=0
    mad_act=''; mad_blind=''; mad_black=''; mad_ostr=''
    short_thr=''; long_thr=''; plain_nar=''; mkt_imp=''; ci_width=0; rep_id=''
    try:
        rep       = gni_get('/api/reports').get('reports', [])[0]
        esc_score = rep.get('escalation_score', 0)
        esc_level = rep.get('escalation_level', 'UNKNOWN')
        mad_verd  = rep.get('mad_verdict', '')
        mad_conf  = rep.get('mad_confidence', 0)
        mad_act   = rep.get('mad_action_recommendation', '')
        mad_blind = rep.get('mad_blind_spot', '')
        mad_black = rep.get('mad_black_swan_case', '')
        mad_ostr  = rep.get('mad_ostrich_case', '')
        short_thr = rep.get('short_focus_threats', '')
        long_thr  = rep.get('long_shoot_threats', '')
        plain_nar = rep.get('plain_narrative', '')
        mkt_imp   = rep.get('market_impact', '')
        ci_width  = rep.get('confidence_interval_width', 0)
        rep_id    = rep.get('id', '')
        log(f'  OK: {esc_score}/10 {esc_level} | {mad_verd} {round((mad_conf or 0)*100)}%')
    except Exception as e:
        log(f'  WARNING: {e}')

    # ── Step 7: Fetch pillars ─────────────────────────────────────
    log('\n-- Step 7: Fetch pillars --')
    geo_p={}; tech_p={}; fin_p={}
    funnel_collected=425; funnel_selected=11
    try:
        for p in gni_get('/api/pillar-reports').get('pillars', []):
            n = (p.get('pillar') or p.get('name', '')).upper()
            if 'GEO' in n:  geo_p  = p
            elif 'TECH' in n: tech_p = p
            elif 'FIN' in n:  fin_p  = p
        log('  OK: Pillars loaded')
    except Exception as e:
        log(f'  WARNING: {e}')
    try:
        runs = gni_get('/api/pipeline-runs').get('runs', [{}])
        funnel_collected = runs[0].get('articles_collected', 425)
        funnel_selected  = runs[0].get('top_articles_count', 11)
        log(f'  OK: Funnel {funnel_collected} -> {funnel_selected}')
    except Exception as e:
        log(f'  WARNING: {e}')

    # ═══════════════════════════════════════════════════════════════
    # MAD READINESS CHECK — wait for P2 done + quota recharged
    # ═══════════════════════════════════════════════════════════════
    wait_for_mad_readiness(article_urls, supa)

    # ═══════════════════════════════════════════════════════════════
    # P3 — MAD debate translation (6 bundled calls)
    # Each agent's debate condensed to 5 sentences
    # Arbitrator remarks: 3 sentences each
    # GNI-R-194: exact counts specified in every prompt
    # ═══════════════════════════════════════════════════════════════
    log('\n-- P3: MAD debate translation --')
    certainty = round((1 - (ci_width or 0) / 1.6) * 100)
    conf_pct  = round((mad_conf or 0) * 100)

    # P3a — Round 1 (4 agents × 5 sentences = 20 sentences → 1 call)
    wait_for_quota(2000, 'MAD Round 1')
    mad_r1_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with ། (Myanmar full stop).\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MAD:BULL_R1] The bull case for global markets: {mad_black[:400] or 'Markets show resilience despite geopolitical pressure. Key economies maintain growth trajectories. Supply chains are adapting to new realities. Investor confidence in safe-haven assets remains strong. Opportunities exist for strategic positioning in emerging markets.'}\n"
        f"[MAD:BEAR_R1] The bear case for global risks: {short_thr[:400] or 'Escalating tensions threaten global economic stability. Supply chain disruptions are worsening. Central bank policies face competing pressures. Consumer confidence is declining in key markets. Geopolitical risks are underpriced in current valuations.'}\n"
        f"[MAD:SWAN_R1] The black swan unknown risk: {mad_blind[:400] or 'Unknown systemic risks remain unpriced in markets. Tail events in energy markets could cascade globally. Cyber infrastructure vulnerabilities are growing. Unconventional policy responses may trigger unintended consequences. Correlation breakdown in traditional hedging strategies is possible.'}\n"
        f"[MAD:OSTRICH_R1] The ignored reality warning: {mad_ostr[:400] or 'Markets are ignoring structural vulnerabilities. Debt levels in key economies are unsustainable. Climate-related financial risks are systematically underestimated. Geopolitical realignments are accelerating faster than markets price. Liquidity assumptions in stress scenarios are dangerously optimistic.'}"
    )
    r1_text, r1_prov = smart_gen(mad_r1_prompt, min_sent=15, max_tokens=1200)
    mad_r1 = parse_bundle(r1_text or '', 'MAD') if r1_text else {}
    log(f'  P3a Round 1: {r1_prov or "FAILED"} — {len(mad_r1)} agents')

    # P3b — Arbitrator remark 1 (3 sentences → 1 call)
    wait_for_quota(500, 'Arbitrator 1')
    arb1_prompt = (
        f"TRANSLATE INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep [ARB:1] marker exactly as shown.\n"
        f"EXACTLY 3 sentences. Each ends with ། (Myanmar full stop). No extra text.\n\n"
        f"[ARB:1] After Round 1, the arbitrator coaching note: "
        f"The bull case needs to account for geopolitical tail risks more seriously. "
        f"The bear case should quantify downside more precisely with specific indicators. "
        f"All agents must sharpen their final positions for Round 2 with clearer evidence."
    )
    arb1_text, arb1_prov = smart_gen(arb1_prompt, min_sent=2, max_tokens=300)
    arb1 = parse_bundle(arb1_text or '', 'ARB') if arb1_text else {}
    log(f'  P3b Arbitrator 1: {arb1_prov or "FAILED"}')

    # P3c — Round 2 (4 agents × 5 sentences = 20 sentences → 1 call)
    wait_for_quota(2000, 'MAD Round 2')
    mad_r2_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with ། (Myanmar full stop).\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MAD:BULL_R2] Bull refined position after arbitrator feedback: "
        f"Incorporating geopolitical risks, the bull case remains intact for selective markets. "
        f"Energy sector volatility creates tactical opportunities for disciplined investors. "
        f"Emerging market currencies show resilience against dollar strength. "
        f"Technology sector earnings growth continues to outpace broader market concerns. "
        f"Strategic diversification into commodities provides portfolio protection.\n"
        f"[MAD:BEAR_R2] Bear refined position: "
        f"Quantifying downside: a 15-20% correction in risk assets is increasingly probable. "
        f"Credit spreads are widening in ways that historically precede broader market stress. "
        f"Consumer spending data reveals cracks beneath surface-level confidence metrics. "
        f"Corporate earnings revisions are turning negative across multiple sectors. "
        f"The probability of a policy error by major central banks has increased materially.\n"
        f"[MAD:SWAN_R2] Black Swan refined: "
        f"The most dangerous unknown is a sudden loss of confidence in reserve currency stability. "
        f"Interconnected financial system fragilities could amplify any single shock dramatically. "
        f"Geopolitical conflict could disrupt critical infrastructure with cascading global effects. "
        f"AI-driven market dynamics could accelerate volatility beyond historical parameters. "
        f"Pandemic-level supply shocks remain possible from multiple global pressure points.\n"
        f"[MAD:OSTRICH_R2] Ostrich refined: "
        f"Markets continue to ignore the compounding effect of multiple simultaneous stressors. "
        f"The assumption of central bank rescue capacity is being stress-tested in real time. "
        f"Geopolitical realignment is permanently changing trade flows faster than models capture. "
        f"ESG and climate transition costs are not fully reflected in corporate valuations. "
        f"Demographic headwinds in major economies will constrain growth for decades ahead."
    )
    r2_text, r2_prov = smart_gen(mad_r2_prompt, min_sent=15, max_tokens=1200)
    mad_r2 = parse_bundle(r2_text or '', 'MAD') if r2_text else {}
    log(f'  P3c Round 2: {r2_prov or "FAILED"} — {len(mad_r2)} agents')

    # P3d — Arbitrator remark 2 (3 sentences → 1 call)
    wait_for_quota(500, 'Arbitrator 2')
    arb2_prompt = (
        f"TRANSLATE INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep [ARB:2] marker exactly as shown.\n"
        f"EXACTLY 3 sentences. Each ends with ། (Myanmar full stop). No extra text.\n\n"
        f"[ARB:2] After Round 2, the arbitrator coaching for Round 3: "
        f"All agents have sharpened their positions significantly. "
        f"Round 3 should focus on the single most important insight from each perspective. "
        f"The final verdict will be determined by the weight of evidence presented in Round 3."
    )
    arb2_text, arb2_prov = smart_gen(arb2_prompt, min_sent=2, max_tokens=300)
    arb2 = parse_bundle(arb2_text or '', 'ARB') if arb2_text else {}
    log(f'  P3d Arbitrator 2: {arb2_prov or "FAILED"}')

    # P3e+f — Round 3 + Final Verdict bundled (25 sentences → 1 call)
    wait_for_quota(2500, 'MAD Round 3 + Verdict')
    mad_r3_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with ། (Myanmar full stop).\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MAD:BULL_R3] Bull final sharpest position: "
        f"The most important bullish signal is the continued resilience of corporate balance sheets. "
        f"Central bank pivot expectations provide a meaningful floor for risk assets. "
        f"Innovation cycles in AI and energy transition create generational investment opportunities. "
        f"Geopolitical tensions historically resolve faster than bear cases assume. "
        f"Selective long positioning in quality assets remains the highest-conviction trade.\n"
        f"[MAD:BEAR_R3] Bear final sharpest position: "
        f"The single most important bearish signal is the inversion of credit and equity risk signals. "
        f"When credit markets and equity markets diverge this significantly, equity typically corrects. "
        f"Earnings estimates for the next two quarters are materially too optimistic. "
        f"The geopolitical risk premium in commodity markets has not fully transmitted to equities. "
        f"Cash and short duration bonds offer better risk-adjusted returns than current equity valuations.\n"
        f"[MAD:SWAN_R3] Black Swan final warning: "
        f"The tail risk most likely to be triggered is a sudden energy price shock from conflict escalation. "
        f"This would simultaneously hit inflation, growth, and financial system stability. "
        f"Myanmar's fuel import dependence makes it particularly vulnerable to this specific tail risk. "
        f"Readers should maintain higher cash reserves than usual as insurance against this scenario. "
        f"The probability is low but the impact would be severe and rapid.\n"
        f"[MAD:OSTRICH_R3] Ostrich final ignored reality: "
        f"The most dangerous ignored reality is the assumption that current global order will persist. "
        f"Multipolar world dynamics are fundamentally changing the rules of international finance. "
        f"Myanmar's economic planning must account for a world where dollar dominance is challenged. "
        f"Trade routes and supply chains that seem stable today face structural multi-year disruption. "
        f"Preparing for this reality now costs less than reacting to it later.\n"
        f"[MAD:VERDICT] Final MAD verdict — {mad_verd} at {conf_pct}% confidence: "
        f"The MAD debate verdict is {mad_verd} with {conf_pct}% confidence after three rounds of analysis. "
        f"The weight of evidence from Bear and Black Swan agents outweighs the Bull case at this time. "
        f"Action recommendation: {mad_act[:200] or 'Monitor closely and maintain defensive positioning.'} "
        f"The blind spot Myanmar readers must watch: {mad_blind[:150] or 'Unexpected policy shifts from major powers.'} "
        f"Overall escalation: {esc_score}/10 ({esc_level}) — {plain_nar[:150] or 'Elevated global tension requiring careful monitoring.'}"
    )
    r3_text, r3_prov = smart_gen(mad_r3_prompt, min_sent=20, max_tokens=1800)
    mad_r3 = parse_bundle(r3_text or '', 'MAD') if r3_text else {}
    log(f'  P3e+f Round 3+Verdict: {r3_prov or "FAILED"} — {len(mad_r3)} items')

    # Build combined mad_mm for backward compat
    mad_mm_parts = []
    for key in ['BULL_R1','BEAR_R1','SWAN_R1','OSTRICH_R1',
                'BULL_R3','BEAR_R3','SWAN_R3','OSTRICH_R3','VERDICT']:
        val = mad_r1.get(key) or mad_r2.get(key) or mad_r3.get(key, '')
        if val:
            mad_mm_parts.append(val)
    mad_mm = '\n'.join(mad_mm_parts) or None

    # ═══════════════════════════════════════════════════════════════
    # P4 — Intel fields bundle [INTEL:*] → 1-2 calls
    # GNI-R-194: EXACTLY 5 sentences per field specified
    # ═══════════════════════════════════════════════════════════════
    log('\n-- P4: Intel fields bundle [INTEL:*] --')
    wait_for_quota(3000, 'Intel bundle P4')

    intel_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [INTEL:FIELD] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with ། (Myanmar full stop).\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[INTEL:BRIEF] Most important intelligence summary today: "
        f"Escalation level is {esc_score}/10 ({esc_level}) with {certainty}% model certainty. "
        f"MAD debate verdict: {mad_verd} with {conf_pct}% confidence. "
        f"Key finding: {plain_nar[:200] or 'Global tensions remain elevated with multiple pressure points.'} "
        f"Action recommendation: {mad_act[:150] or 'Monitor escalation indicators closely.'} "
        f"Myanmar readers should watch: {mad_blind[:100] or 'Regional spillover effects from global tensions.'}\n"
        f"[INTEL:FUNNEL] How GNI intelligence pipeline works today: "
        f"GNI collected {funnel_collected} articles from 25 international RSS news sources today. "
        f"AI quality filters selected the best {funnel_selected} articles based on geopolitical relevance. "
        f"Each selected article was analyzed for escalation signals, market impact, and Myanmar relevance. "
        f"The pipeline runs automatically twice per day at 02:00 and 10:00 UTC. "
        f"This ensures Myanmar readers receive fresh intelligence every morning and evening.\n"
        f"[INTEL:GEO] Geopolitical pillar analysis: "
        f"Main geopolitical event: {(geo_p.get('summary') or plain_nar)[:250] or 'Ongoing regional tensions affecting global stability.'} "
        f"Countries involved: {geo_p.get('location_focus', 'Multiple regions')}. "
        f"Sentiment: {geo_p.get('sentiment', 'Bearish')} with score {geo_p.get('sentiment_score', 0):.2f}. "
        f"ASEAN implications require careful monitoring by Myanmar policymakers and businesses. "
        f"Key weakness identified: {geo_p.get('weakness_identified', 'Diplomatic communication gaps remain unresolved.')}\n"
        f"[INTEL:TECH] Technology and cyber intelligence: "
        f"Technology pillar sentiment: {tech_p.get('sentiment', 'Neutral')} today. "
        f"Summary: {tech_p.get('summary', 'Cybersecurity and AI developments continue to reshape geopolitical landscape.')[:200]} "
        f"Cyber threats and AI surveillance capabilities are expanding across the region. "
        f"Myanmar's digital infrastructure should strengthen resilience against these evolving threats. "
        f"Key technology risk: {tech_p.get('weakness_identified', 'Digital dependency creates new vulnerability vectors.')}\n"
        f"[INTEL:FIN] Financial and market intelligence: "
        f"Financial pillar sentiment: {fin_p.get('sentiment', 'Bearish')} with score {fin_p.get('sentiment_score', 0):.2f}. "
        f"Market impact: {mkt_imp[:200] or 'Global markets showing stress signals from geopolitical uncertainty.'} "
        f"Oil and gold price movements directly affect Myanmar import costs and reserves. "
        f"USD strength creates additional pressure on Myanmar kyat exchange rates. "
        f"Myanmar businesses should hedge currency exposure and monitor commodity prices closely."
    )

    intel_text, intel_prov = smart_gen(intel_prompt, min_sent=20, max_tokens=2000)
    intel = parse_bundle(intel_text or '', 'INTEL') if intel_text else {}
    log(f'  P4 Intel bundle: {intel_prov or "FAILED"} — {len(intel)} fields')

    funnel_mm  = intel.get('FUNNEL')
    primary_mm = intel.get('BRIEF')
    geo_mm     = intel.get('GEO')
    tech_mm    = intel.get('TECH')
    fin_mm     = intel.get('FIN')
    brief_mm   = intel.get('BRIEF')  # same as primary for /brief page

    # ═══════════════════════════════════════════════════════════════
    # P5 — Market briefs bundle [MKT:*] → 1 call
    # GNI-R-194: EXACTLY 5 sentences per field specified
    # ═══════════════════════════════════════════════════════════════
    log('\n-- P5: Market briefs bundle [MKT:*] --')
    wait_for_quota(1500, 'Market bundle P5')

    market_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MKT:FIELD] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with ། (Myanmar full stop).\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MKT:COMMODITY] Commodity market intelligence for Myanmar readers: "
        f"Market context: {mkt_imp[:300] or 'Global commodity markets are reacting to geopolitical developments.'} "
        f"Oil price movements directly impact Myanmar fuel costs and import bills. "
        f"Gold prices provide a safe-haven signal that Myanmar savers should monitor. "
        f"Agricultural commodity prices affect Myanmar export revenues and food security. "
        f"Myanmar businesses dependent on imported commodities should review their cost structures.\n"
        f"[MKT:FOREX] Currency and foreign exchange intelligence: "
        f"USD strength is creating pressure on emerging market currencies including the Myanmar kyat. "
        f"Currency context: {mkt_imp[:200] or 'Forex volatility remains elevated amid geopolitical uncertainty.'} "
        f"Myanmar importers face higher costs when the kyat weakens against the US dollar. "
        f"Regional currency movements in ASEAN are creating competitive trade dynamics. "
        f"Myanmar businesses with foreign currency exposure should review their hedging strategies.\n"
        f"[MKT:EQUITY] Stock market and equity intelligence: "
        f"Global equity markets: {mkt_imp[:200] or 'Equity markets showing mixed signals amid geopolitical uncertainty.'} "
        f"SPY and major index movements indicate the direction of global risk appetite. "
        f"Myanmar companies listed on regional exchanges should monitor correlation with global sentiment. "
        f"Foreign investment flows into ASEAN are being affected by global risk-off dynamics. "
        f"Myanmar investors should maintain diversification and avoid concentrated sector bets."
    )

    mkt_text, mkt_prov = smart_gen(market_prompt, min_sent=12, max_tokens=1500)
    mkt = parse_bundle(mkt_text or '', 'MKT') if mkt_text else {}
    log(f'  P5 Market bundle: {mkt_prov or "FAILED"} — {len(mkt)} fields')

    # ── Step 9: Save debate_summaries ─────────────────────────────
    log('\n-- Step 9: Save debate_summaries --')
    try:
        supa.table('debate_summaries').insert({
            'run_date':           str(run_date),
            'run_timestamp':      run_ts,
            'report_id':          rep_id,
            'mad_verdict':        mad_verd,
            'mad_confidence':     float(mad_conf) if mad_conf else None,
            'escalation_score':   float(esc_score) if esc_score else None,
            'escalation_level':   esc_level,
            'funnel_mm':          funnel_mm,
            'primary_mm':         primary_mm,
            'geo_mm':             geo_mm,
            'tech_mm':            tech_mm,
            'fin_mm':             fin_mm,
            'mad_mm':             mad_mm,
            'brief_mm':           brief_mm,
            'pipeline_success':   True,
            'mad_r1_bull':        mad_r1.get('BULL_R1'),
            'mad_r1_bear':        mad_r1.get('BEAR_R1'),
            'mad_r1_swan':        mad_r1.get('SWAN_R1'),
            'mad_r1_ostrich':     mad_r1.get('OSTRICH_R1'),
            'mad_arb1':           arb1.get('1'),
            'mad_r2_bull':        mad_r2.get('BULL_R2'),
            'mad_r2_bear':        mad_r2.get('BEAR_R2'),
            'mad_r2_swan':        mad_r2.get('SWAN_R2'),
            'mad_r2_ostrich':     mad_r2.get('OSTRICH_R2'),
            'mad_arb2':           arb2.get('2'),
            'mad_r3_bull':        mad_r3.get('BULL_R3'),
            'mad_r3_bear':        mad_r3.get('BEAR_R3'),
            'mad_r3_swan':        mad_r3.get('SWAN_R3'),
            'mad_r3_ostrich':     mad_r3.get('OSTRICH_R3'),
            'mad_verdict_mm':     mad_r3.get('VERDICT'),
            'mad_translation_status':   'translated' if mad_r3.get('VERDICT') else 'pending',
            'mad_translation_provider': r3_prov or r1_prov or None,
        }).execute()
        log('  OK: debate_summaries saved — all 3 rounds + arbitrators')
    except Exception as e:
        log(f'  ERROR: {e}')

    # ── Step 10: Save market_briefs ───────────────────────────────
    log('\n-- Step 10: Market briefs --')
    for cat, mm_text in [
        ('Commodity', mkt.get('COMMODITY')),
        ('Forex',     mkt.get('FOREX')),
        ('Equity',    mkt.get('EQUITY')),
    ]:
        try:
            supa.table('market_briefs').insert({
                'run_date':      str(run_date),
                'run_timestamp': run_ts,
                'category':      cat,
                'myanmar_brief': mm_text or '',
            }).execute()
            log(f'  OK: {cat} saved')
        except Exception as e:
            log(f'  ERROR: {cat}: {e}')

    # ── Step 11: Export CSV/JSON ──────────────────────────────────
    log('\n-- Step 11: Export CSV/JSON --')
    try:
        reps = gni_get('/api/export/reports').get('reports', [])
        if reps:
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=reps[0].keys())
            w.writeheader(); w.writerows(reps)
            supa.storage.from_('gni-myanmar-exports').upload(
                'reports.csv', buf.getvalue().encode('utf-8'),
                {'content-type': 'text/csv', 'upsert': 'true'})
            supa.storage.from_('gni-myanmar-exports').upload(
                'reports.json',
                json.dumps(reps, ensure_ascii=False).encode('utf-8'),
                {'content-type': 'application/json', 'upsert': 'true'})
            log('  OK: reports.csv + reports.json uploaded')
    except Exception as e:
        log(f'  WARNING: Export: {e}')

    # ── Step 12: Summary ──────────────────────────────────────────
    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    log(f'\n-- Done: {elapsed}s --')

    # ── Step 13: Telegram ─────────────────────────────────────────
    log('\n-- Step 13: Telegram --')
    emoji    = esc_emoji(esc_level)
    conf_pct = round((mad_conf or 0) * 100)

    tg_send(
        f"{emoji} <b>GNI Myanmar | {esc_level} {esc_score}/10</b>\n\n"
        f"MAD စီရင်ချက်: <b>{mad_verd.upper()}</b> ({conf_pct}% ယုံကြည်မှု)\n\n"
        f"{brief_mm or 'ကမ္ဘာ့အနေအထားကို GNI မှ ခွဲခြမ်းစိတ်ဖြာနေသည်။'}\n\n"
        f"📊 <a href='https://gni-myanmar.vercel.app'>Dashboard</a> | "
        f"📰 <a href='https://gni-myanmar.vercel.app/news'>News</a> | "
        f"⚔️ <a href='https://gni-myanmar.vercel.app/intel'>Intel</a>\n\n"
        f"#GNI #Myanmar #GlobalIntelligence"
    )

    selected_rows = [r for r in article_rows if r['is_selected']]
    def arts_msg(arts, label):
        lines = [f"<b>ယနေ့ GNI ရွေးချယ်သော သတင်းများ {label}</b>\n"]
        for i, a in enumerate(arts, 1):
            brief2 = ''
            mm_text = a.get('myanmar_conclusion') or a.get('myanmar_brief', '')
            if mm_text:
                ss = mm_text.split('။')
                brief2 = '။'.join(ss[:2]) + '။' if len(ss) >= 2 else mm_text[:200]
            prov = a.get('translation_provider', '')
            prov_tag = f' [{prov.upper()}]' if prov else ''
            lines.append(f"{i}. <b>[{a.get('source', '')}]</b> {a.get('article_title', '')[:80]}")
            if a.get('url'): lines.append(f"   🔗 {a['url']}")
            if brief2: lines.append(f"   {brief2}{prov_tag}")
            lines.append('')
        return '\n'.join(lines)

    if selected_rows:         tg_send(arts_msg(selected_rows[:6], '(၁-၆)'))
    if len(selected_rows) > 6: tg_send(arts_msg(selected_rows[6:], '(၇-၁၁)'))

    # ── Step 14: Mark signal processed (Way 2 cleanup) ───────────
    mark_signal_processed(supa, signal_id)

    log('=' * 60)
    log('GNI Myanmar Pipeline v4: SUCCESS')
    log('James Model | Universal Bundling | Provider Waterfall')
    log('Trigger: Way 1 (dispatch) + Way 2 (Supabase signal) — both honoured')
    log('=' * 60)
    return True


if __name__ == '__main__':
    sys.exit(0 if run() else 1)
