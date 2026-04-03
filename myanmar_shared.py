#!/usr/bin/env python3
"""
myanmar_shared.py -- GNI Myanmar Shared Functions
Used by all 5 Myanmar pipelines.
Team Geeks | Session 16-17 | April 2026
GNI-R-169: Direct REST to Groq (NOT groq library)
GNI-R-194: Every prompt specifies EXACT sentence count
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.

S17 ADDITIONS:
- cerebras_gen()    -- PRIMARY for Pipeline 4 (MAD) -- 1M TPD free
- openrouter_gen()  -- PRIMARY for Pipeline 5 (Market) -- 50 RPD free
- cerebras_gen() -- BACKUP 1 for Intel/Articles/Market (14,400 RPD free forever)
- github_models_gen()-- BACKUP 2 for all pipelines
- smart_gen() now accepts pipeline= param for dedicated waterfall
- gemini fixed: 2.0-flash -> 2.5-flash (2.0 RETIRED March 3 2026)
- check_health() updated for all 7 providers
"""

import os, sys, re, time, json
from datetime import datetime, timezone
import requests
from supabase import create_client

GNI_API    = "https://gni-autonomous.vercel.app"
GNI_KEY    = os.getenv("GNI_API_KEY", "")
GROQ_KEY   = os.getenv("GROQ_API_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
CF_TOKEN   = os.getenv("CF_API_TOKEN", "")
CF_ACCOUNT = os.getenv("CF_ACCOUNT_ID", "")
CEREBRAS_KEY  = os.getenv("CEREBRAS_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")

GH_KEY     = os.getenv("GH_MODELS_KEY", "")
SUPA_URL   = os.getenv("SUPABASE_URL", "")
SUPA_KEY   = os.getenv("SUPABASE_SERVICE_KEY", "")
TG_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
TG_CHANNEL = os.getenv("TELEGRAM_CHANNEL_ID", "-1003855420750")
GROQ_MODEL = "llama-3.3-70b-versatile"

def log(msg): print(msg, flush=True)

def get_supa():
    if not SUPA_URL or not SUPA_KEY:
        raise Exception("Supabase creds not set")
    return create_client(SUPA_URL, SUPA_KEY)

def gni_get(path):
    res = requests.get(
        GNI_API + path,
        headers={"X-GNI-Key": GNI_KEY, "X-Client": "myanmar-pipeline-v4"},
        timeout=30)
    res.raise_for_status()
    return res.json()

class RateLimitError(Exception):
    def __init__(self, retry_after=60):
        self.retry_after = int(retry_after)

class CapacityError(Exception): pass

# ============================================================
# PROVIDER FUNCTIONS
# ============================================================

def groq_rest(prompt, max_tokens=600):
    """PRIMARY for Pipeline 3 (Articles). 6,000 TPM | 500,000 TPD | 30 RPM | 1,000 RPD"""
    if not GROQ_KEY:
        raise Exception("GROQ_API_KEY not set")
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_KEY}",
                 "Content-Type": "application/json"},
        json={"model": GROQ_MODEL, "max_tokens": max_tokens,
              "temperature": 0.3,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=30)
    if r.status_code == 429:
        raise RateLimitError(int(r.headers.get("retry-after", 60)))
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip(), r.headers

def gemini_gen(prompt, max_tokens=2000):
    """PRIMARY for Pipeline 2 (Intel). 250,000 TPM | 10 RPM | 500 RPD free.
    FIXED S17: gemini-2.0-flash RETIRED March 3 2026 -> now gemini-2.5-flash-preview-04-17
    FIXED S17b: thinking mode disabled (thinkingBudget=0) + join all parts"""
    if not GEMINI_KEY:
        raise Exception("GEMINI_API_KEY not set")
    r = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        headers={"Content-Type": "application/json"},
        params={"key": GEMINI_KEY},
        json={"contents": [{"parts": [{"text": prompt}]}],
              "generationConfig": {"maxOutputTokens": max_tokens,
                                   "temperature": 0.3,
                                   "thinkingConfig": {"thinkingBudget": 0}}},
        timeout=60)
    if r.status_code == 429:
        raise RateLimitError(60)
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    text = " ".join(p.get("text", "") for p in parts).strip()
    
    return text, {}

def cerebras_gen(prompt, max_tokens=600):
    """PRIMARY for Pipeline 4 (MAD). ~1M TPD free | 30 RPM | 60K TPM free.
    UPGRADED S18: llama3.1-8b -> gpt-oss-120b (MoE 120B, 5.1B active, free tier confirmed)
    OpenAI-compatible REST. api.cerebras.ai"""
    if not CEREBRAS_KEY:
        raise Exception("CEREBRAS_API_KEY not set")
    r = requests.post(
        "https://api.cerebras.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {CEREBRAS_KEY}",
                 "Content-Type": "application/json"},
        json={"model": "gpt-oss-120b",
              "max_tokens": max_tokens,
              "temperature": 0.3,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=30)
    if r.status_code == 429:
        raise RateLimitError(int(r.headers.get("retry-after", 60)))
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip(), r.headers

def openrouter_gen(prompt, max_tokens=600):
    """PRIMARY for Pipeline 5 (Market). 20 RPM | 50 RPD (free, no deposit).
    WARNING: Only 50 RPD! Sufficient for Market (1-3 calls/day). openrouter.ai/api/v1"""
    if not OPENROUTER_KEY:
        raise Exception("OPENROUTER_API_KEY not set")
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_KEY}",
                 "Content-Type": "application/json",
                 "HTTP-Referer": "https://gni-myanmar.vercel.app",
                 "X-Title": "GNI Myanmar Pipeline"},
        json={"model": "meta-llama/llama-3.3-70b-instruct:free",
              "max_tokens": max_tokens,
              "temperature": 0.3,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=45)
    if r.status_code == 429:
        raise RateLimitError(int(r.headers.get("retry-after", 60)))
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip(), {}



def github_models_gen(prompt, max_tokens=600):
    """BACKUP 2 for all pipelines. 10-15 RPM | 50-150 RPD free.
    GNI-R-171: MUST use CLASSIC PAT (ghp_) with repo scope -- fine-grained tokens DO NOT work.
    models.inference.ai.azure.com"""
    if not GH_KEY:
        raise Exception("GH_MODELS_KEY not set")
    r = requests.post(
        "https://models.inference.ai.azure.com/chat/completions",
        headers={"Authorization": f"Bearer {GH_KEY}",
                 "Content-Type": "application/json"},
        json={"model": "Llama-3.3-70B-Instruct",
              "max_tokens": max_tokens,
              "temperature": 0.3,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=45)
    if r.status_code == 429:
        raise RateLimitError(int(r.headers.get("retry-after", 60)))
    if r.status_code == 503:
        raise CapacityError()
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip(), {}

def cloudflare_gen(prompt, max_tokens=1024):
    """BACKUP 3 -- LAST RESORT ONLY. Only 10,000 neurons/day (~1,000-3,000 tokens).
    Use ONLY when all other providers fail."""
    if not CF_TOKEN or not CF_ACCOUNT:
        raise Exception("CF_API_TOKEN or CF_ACCOUNT_ID not set")
    r = requests.post(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/run/@cf/meta/llama-3.1-8b-instruct",
        headers={"Authorization": f"Bearer {CF_TOKEN}",
                 "Content-Type": "application/json"},
        json={"messages": [{"role": "user", "content": prompt}],
              "max_tokens": min(max_tokens, 512)},
        timeout=60)
    r.raise_for_status()
    return r.json()["result"]["response"].strip(), {}

# ============================================================
# PIPELINE-SPECIFIC WATERFALL
# Each pipeline has its own PRIMARY to avoid quota interference.
# Fallback chain: Backup1 (HF) -> Backup2 (GitHub) -> Backup3 (CF)
#
# Pipeline 2 Intel:   Gemini  -> HF -> GitHub -> CF
# Pipeline 3 Articles:Groq    -> HF -> GitHub -> CF
# Pipeline 4 MAD:     Cerebras-> HF -> GitHub -> CF
# Pipeline 5 Market:  OpenRouter -> HF -> GitHub -> CF
# Default (backward compat): Groq -> Gemini -> CF
# ============================================================

PIPELINE_PROVIDERS = {
    "intel":    [
        ("gemini",     lambda p, t: gemini_gen(p, t * 3)),
        ("cerebras",   lambda p, t: cerebras_gen(p, t)),
        ("github",     lambda p, t: github_models_gen(p, t)),
        ("cloudflare", lambda p, t: cloudflare_gen(p, min(t * 2, 512))),
    ],
    "articles": [
        ("groq",       lambda p, t: groq_rest(p, t)),
        ("cerebras",   lambda p, t: cerebras_gen(p, t)),
        ("github",     lambda p, t: github_models_gen(p, t)),
        ("cloudflare", lambda p, t: cloudflare_gen(p, min(t * 2, 512))),
    ],
    "mad": [
        ("cerebras",   lambda p, t: cerebras_gen(p, t)),
        ("github",     lambda p, t: github_models_gen(p, t)),
        ("cloudflare", lambda p, t: cloudflare_gen(p, min(t * 2, 512))),
    ],
    "market": [
        ("openrouter", lambda p, t: openrouter_gen(p, t)),
        ("cerebras",   lambda p, t: cerebras_gen(p, t)),
        ("github",     lambda p, t: github_models_gen(p, t)),
        ("cloudflare", lambda p, t: cloudflare_gen(p, min(t * 2, 512))),
    ],
    "default": [
        ("groq",       lambda p, t: groq_rest(p, t)),
        ("gemini",     lambda p, t: gemini_gen(p, t * 3)),
        ("cloudflare", lambda p, t: cloudflare_gen(p, min(t * 2, 512))),
    ],
}

def smart_gen(prompt, min_sent=5, max_tokens=600, pipeline="default"):
    """
    Pipeline-aware smart translation with dedicated primary per pipeline.
    pipeline = "intel" | "articles" | "mad" | "market" | "default"
    """
    providers = PIPELINE_PROVIDERS.get(pipeline, PIPELINE_PROVIDERS["default"])
    log(f"    [smart_gen] pipeline={pipeline} providers={[p[0] for p in providers]}")

    for pname, pfn in providers:
        capacity_errors = 0
        for attempt in range(4):
            try:
                text, headers = pfn(prompt, max_tokens)
                text = strip_disclaimers(text)
                n = count_sentences(text)
                
                if n >= min_sent:
                    log(f"    [{pname.upper()}] OK ({n} sentences) attempt {attempt+1}")
                    return text, pname
                log(f"    [{pname.upper()}] Only {n} sentences (need {min_sent}), retrying...")
                time.sleep(3)
            except RateLimitError as e:
                wait = min(e.retry_after, 120)
                log(f"    [{pname.upper()}] Rate limited. Sleeping {wait}s...")
                time.sleep(wait)
            except CapacityError:
                capacity_errors += 1
                if capacity_errors >= 5:
                    log(f"    [{pname.upper()}] Down (5x 503). Switching provider.")
                    break
                log(f"    [{pname.upper()}] Over capacity. Sleeping 30s...")
                time.sleep(30)
            except Exception as e:
                log(f"    [{pname.upper()}] Error: {e}. Switching provider.")
                break

    log("    ALL PROVIDERS FAILED -- returning None")
    return None, None

# ============================================================
# PARSING + QUALITY GATES
# ============================================================

def parse_bundle(response_text, tag):
    if not response_text:
        return {}
    pattern = rf"\[{tag}:([^\]]+)\](.*?)(?=\[{tag}:|$)"
    matches = re.findall(pattern, response_text, re.DOTALL)
    return {key.strip(): text.strip() for key, text in matches}

def check_quota():
    """Check Groq quota -- used by Articles pipeline (Groq primary)."""
    try:
        _, headers = groq_rest("OK", max_tokens=1)
        remaining = int(headers.get("x-ratelimit-remaining-tokens", 6000))
        log(f"  Groq quota: {remaining} tokens remaining")
        return remaining
    except Exception as e:
        log(f"  Quota check failed: {e}")
        return 3000

def wait_for_quota(min_tokens=3000, label="next phase"):
    while True:
        q = check_quota()
        if q >= min_tokens:
            log(f"  Quota OK: {q} tokens. Starting {label}.")
            return
        log(f"  Quota low ({q}). Need {min_tokens}. Sleeping 60s...")
        time.sleep(60)

DISCLAIMER_PATTERNS = [
    r"(?i)note:\s*i (tried|attempt)",
    r"(?i)please note that",
    r"(?i)as an ai",
    r"(?i)i am not able to",
    r"(?i)i cannot guarantee",
    r"(?i)translation may not be",
    r"(?i)this is my best",
    r"(?i)i have translated",
    r"(?i)myanmar translation:",
    r"(?i)here is the translation",
    r"(?i)here are the sentences",
    r"(?i)myanmar language",
    r"မြန်မာဘာသာ ပြန်",
    r"မြန်မာဘာသာ အက္ခ",
    r"မြန်မာဘာသာ စကား",
]

def strip_disclaimers(text):
    if not text: return text
    lines = text.split("\n")
    clean = []
    for line in lines:
        if any(re.search(p, line) for p in DISCLAIMER_PATTERNS):
            log(f"    [QG1] Stripped: {line[:60]}")
        else:
            clean.append(line)
    return "\n".join(clean).strip()

def repetition_detected(text, min_len=15, max_repeats=3):
    if not text: return False
    sentences = [s.strip() for s in re.split(r"[။\n]", text)
                 if len(s.strip()) >= min_len]
    seen = {}
    for s in sentences:
        key = s[:min_len]
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > max_repeats:
            log(f"    [QG2] Repetition: {key[:40]}...")
            return True
    return False

def count_sentences(text):
    if not text: return 0
    mm_104a = text.count("\u104A")  # ။ Myanmar sign little section
    mm_104b = text.count("\u104B")  # ၊ Myanmar sign section  
    mm_0f0d = text.count("\u0F0D")  # ། Tibetan mark shad (fallback)
    mm_e18b = text.count("\xe1\x81\x8b") if isinstance(text, bytes) else 0
    en = len(re.findall(r"[.!?](?:\s|$)", text))
    log(f"    [COUNT] 104A={mm_104a} 104B={mm_104b} 0F0D={mm_0f0d} en={en}")
    return max(mm_104a, mm_104b, mm_0f0d, en)

def quality_ok(label, text, min_sent=5):
    if not text:
        log(f"    [QG] {label}: EMPTY"); return False
    if repetition_detected(text):
        log(f"    [QG] {label}: REPETITION"); return False
    n = count_sentences(text)
    if n < min_sent:
        log(f"    [QG] {label}: only {n} sentences (need {min_sent})"); return False
    log(f"    [QG] {label}: OK ({n} sentences)")
    return True

# ============================================================
# SUPABASE SIGNALS
# ============================================================

def write_signal(supa, source, status="complete", data=None):
    try:
        row = {"source": source, "status": status,
               "processed": False,
               "created_at": datetime.now(timezone.utc).isoformat()}
        if data:
            row.update(data)
        supa.table("pipeline_signals").insert(row).execute()
        log(f"  OK: Signal written -- {source}:{status}")
        return True
    except Exception as e:
        log(f"  WARNING: Signal write failed: {e}")
        return False

def read_signal(supa, source):
    try:
        res = supa.table("pipeline_signals")\
            .select("*")\
            .eq("source", source)\
            .eq("status", "complete")\
            .eq("processed", False)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        if res.data:
            return res.data[0]
        return None
    except Exception as e:
        log(f"  WARNING: Signal read failed: {e}")
        return None

def mark_signal_processed(supa, signal_id):
    if not signal_id: return
    try:
        supa.table("pipeline_signals")\
            .update({"processed": True})\
            .eq("id", signal_id)\
            .execute()
        log(f"  OK: Signal {signal_id} marked processed")
    except Exception as e:
        log(f"  WARNING: Could not mark signal: {e}")

def wait_for_signal(supa, source, timeout_min=45, poll_sec=30):
    waited = 0
    max_wait = timeout_min * 60
    log(f"  Waiting for signal: {source} (max {timeout_min} min)...")
    while waited < max_wait:
        sig = read_signal(supa, source)
        if sig:
            log(f"  OK: Signal received from {source}")
            mark_signal_processed(supa, sig["id"])
            return sig
        time.sleep(poll_sec)
        waited += poll_sec
        log(f"  Still waiting for {source}... ({waited//60}m elapsed)")
    log(f"  TIMEOUT: No signal from {source} after {timeout_min} min. Proceeding anyway.")
    return None

# ============================================================
# TELEGRAM
# ============================================================

def tg_send(text):
    if not TG_TOKEN:
        log("  WARNING: No TG_TOKEN"); return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHANNEL, "text": text,
                  "parse_mode": "HTML",
                  "disable_web_page_preview": True},
            timeout=15)
        log("  OK: Telegram sent")
        time.sleep(1)
    except Exception as e:
        log(f"  WARNING: Telegram: {e}")

def esc_emoji(level):
    return {"CRITICAL": "[CRITICAL]", "HIGH": "[HIGH]", "ELEVATED": "[ELEVATED]",
            "MODERATE": "[MODERATE]", "LOW": "[LOW]"}.get(
                (level or "").upper(), "[INFO]")

# ============================================================
# HEALTH CHECK -- all 7 providers
# ============================================================

def check_health(supa):
    health = {}
    try:
        supa.table("pipeline_signals").select("id").limit(1).execute()
        health["supabase"] = "OK"
    except Exception as e:
        health["supabase"] = f"ERROR: {str(e)[:60]}"
    try:
        res = requests.get(GNI_API + "/api/health",
                          headers={"X-GNI-Key": GNI_KEY}, timeout=10)
        health["gni_api"] = "OK" if res.status_code == 200 else f"HTTP {res.status_code}"
    except Exception as e:
        health["gni_api"] = f"ERROR: {str(e)[:60]}"
    health["groq_key"]       = "SET" if GROQ_KEY        else "MISSING"
    health["gemini_key"]     = "SET" if GEMINI_KEY      else "MISSING"
    health["cerebras_key"]   = "SET" if CEREBRAS_KEY    else "MISSING"
    health["openrouter_key"] = "SET" if OPENROUTER_KEY  else "MISSING"
    
    health["gh_key"]         = "SET" if GH_KEY          else "MISSING"
    health["cf_token"]       = "SET" if CF_TOKEN        else "MISSING"
    return health