#!/usr/bin/env python3
"""
myanmar_articles.py -- GNI Myanmar Pipeline 3: Article Translation
Generates 11 English conclusions + translates to Myanmar.
James Model V4 | P1 (11 calls) + P2 (bundle [ART:*])
Team Geeks | Session 16 | April 2026
GNI-R-194: Every prompt specifies EXACT sentence count
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import sys
from datetime import datetime, timezone, timedelta
from myanmar_shared import (
    log, get_supa, gni_get, smart_gen, parse_bundle,
    check_quota, wait_for_quota, quality_ok, write_signal
)

def run_articles(supa, run_date, run_ts):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Pipeline 3 -- Article Translation")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    log("\n-- Step 1: Cleanup 365-day retention --")
    cutoff = (start - timedelta(days=365)).isoformat()
    for t in ["article_briefs", "market_briefs", "debate_summaries"]:
        try:
            supa.table(t).delete().lt("created_at", cutoff).execute()
            log(f"  OK: {t} cleaned")
        except Exception as e:
            log(f"  WARNING: {t}: {e}")

    log("\n-- Step 2: Fetch selected articles --")
    try:
        ev_data  = gni_get("/api/article-events")
        events   = ev_data.get("events", ev_data.get("articles", []))
        selected = events[:11]
        log(f"  OK: {len(events)} articles -- using top {len(selected)}")
    except Exception as e:
        log(f"  ABORT: {e}"); return {"success": False}

    log("\n-- P1: English conclusions (Pro-Democracy Myanmar POV) --")
    article_rows = []
    article_urls = []

    for i, ev in enumerate(selected):
        title   = ev.get("title", "")
        source  = ev.get("source", "")
        lat     = ev.get("lat")
        lng     = ev.get("lng")
        esc     = ev.get("escalation_score", 0)
        url     = ev.get("url", ev.get("link", ""))
        has_geo = lat is not None and lng is not None
        log(f"  [P1:{i+1}] {title[:60]}")

        # Check if english_conclusion already exists for this URL
        existing_eng = None
        try:
            ex_res = supa.table("article_briefs")\
                .select("english_conclusion, translation_status")\
                .eq("url", url[:1000])\
                .eq("run_date", str(run_date))\
                .limit(1).execute()
            if ex_res.data and ex_res.data[0].get("english_conclusion"):
                existing_eng = ex_res.data[0]["english_conclusion"]
                log(f"    P1 already done -- skipping smart_gen")
        except Exception as e:
            log(f"    WARNING: existing check failed: {e}")

        if existing_eng:
            row = {
                "run_date":             str(run_date),
                "run_timestamp":        run_ts,
                "article_title":        title[:500],
                "url":                  url[:1000],
                "source":               source[:100],
                "is_selected":          True,
                "has_geo":              has_geo,
                "lat":                  float(lat) if lat else None,
                "lng":                  float(lng) if lng else None,
                "escalation_score":     float(esc) if esc else None,
                "myanmar_brief":        None,
                "english_conclusion":   existing_eng,
                "myanmar_conclusion":   None,
                "translation_status":   ex_res.data[0].get("translation_status", "pending"),
                "translation_provider": None,
            }
            article_rows.append(row)
            article_urls.append(url)
            continue

        prompt = (
            f"Article title: {title}\n"
            f"Source: {source}\n"
            f"Escalation score: {esc}/10\n\n"
            f"Write a conclusion from the perspective of a senior Irrawaddy journalist. "
            f"Be factual and values-clear regarding democratic governance and human rights. "
            f"Let facts carry the meaning -- do not editorialize.\n\n"
            f"Write EXACTLY 5 complete sentences in English. Each sentence ends with a period.\n"
            f"Sentence 1: What happened.\n"
            f"Sentence 2: Who is involved and what they did.\n"
            f"Sentence 3: Why this matters for Myanmar and the region.\n"
            f"Sentence 4: ASEAN and geopolitical implications.\n"
            f"Sentence 5: What Myanmar readers should watch next.\n"
            f"Total length: approximately 80 words. No disclaimers. No notes."
        )

        english_text, provider = smart_gen(prompt, min_sent=5, max_tokens=300, pipeline="articles")

        row = {
            "run_date":             str(run_date),
            "run_timestamp":        run_ts,
            "article_title":        title[:500],
            "url":                  url[:1000],
            "source":               source[:100],
            "is_selected":          True,
            "has_geo":              has_geo,
            "lat":                  float(lat) if lat else None,
            "lng":                  float(lng) if lng else None,
            "escalation_score":     float(esc) if esc else None,
            "myanmar_brief":        None,
            "english_conclusion":   english_text,
            "myanmar_conclusion":   None,
            "translation_status":   "pending" if english_text else "failed",
            "translation_provider": None,
        }
        article_rows.append(row)
        article_urls.append(url)
        log(f"    P1 saved: {provider or 'FAILED'} -- {title[:40]}")

    log("\n-- Step 4: Fetch collected articles archive --")
    try:
        all_arts = gni_get("/api/export/articles").get("articles", [])
        selected_urls = {r["url"] for r in article_rows}
        for art in all_arts[:500]:
            u = art.get("url", art.get("link", ""))
            if u not in selected_urls:
                article_rows.append({
                    "run_date": str(run_date), "run_timestamp": run_ts,
                    "article_title": str(art.get("title", ""))[:500],
                    "url": str(u)[:1000],
                    "source": str(art.get("source", ""))[:100],
                    "is_selected": False, "has_geo": False,
                    "lat": None, "lng": None,
                    "escalation_score": None,
                    "myanmar_brief": None,
                    "english_conclusion": None,
                    "myanmar_conclusion": None,
                    "translation_status": None,
                    "translation_provider": None,
                })
        log(f"  OK: {len(article_rows)} total article rows")
    except Exception as e:
        log(f"  WARNING: {e}")

    log("\n-- Step 5: Save article_briefs --")
    try:
        for i in range(0, len(article_rows), 50):
            supa.table("article_briefs").insert(article_rows[i:i+50]).execute()
        log(f"  OK: {len(article_rows)} rows saved")
    except Exception as e:
        log(f"  ERROR: {e}")

    log("\n-- P2: Myanmar translation bundle [ART:1..11] --")
    import time as _time

    TOKENS_PER_ARTICLE = 600   # ~300 input + ~300 output for 5 sentences
    MAX_BATCH          = 4     # never more than 4 -- prevents Groq truncation
    TIMEOUT_SAFE_MIN   = 22    # exit cleanly before 25min YML timeout
    loop_attempt       = 0
    max_attempts       = 5

    # Build url->row map for quick lookup
    url_to_row = {r["url"]: r for r in article_rows if r["is_selected"] and r.get("english_conclusion")}

    while loop_attempt < max_attempts:
        loop_attempt += 1
        elapsed_min = (datetime.now(timezone.utc) - start).total_seconds() / 60

        # Safety check -- stop before YML timeout
        if elapsed_min >= TIMEOUT_SAFE_MIN:
            log(f"  SAFE STOP: {elapsed_min:.1f} min elapsed -- approaching timeout")
            log(f"  Writing needs_rerun signal -- management will re-dispatch")
            write_signal(supa, "articles_pipeline", "needs_rerun")
            break

        # Fetch pending articles from Supabase
        try:
            pend_res = supa.table("article_briefs")\
            .select("url, english_conclusion")\
            .eq("is_selected", True)\
            .eq("run_date", str(run_date))\
            .eq("translation_status", "pending")\
            .order("created_at", desc=False)\
            .execute()
            pending = pend_res.data or []
        except Exception as e:
            log(f"  WARNING: Could not fetch pending: {e}")
            pending = [r for r in url_to_row.values() if r.get("translation_status") == "pending"]

        if not pending:
            log(f"  All articles translated! Loop {loop_attempt} done.")
            break

        log(f"\n  Loop {loop_attempt}/{max_attempts} -- {len(pending)} articles pending")

        # Calculate exact batch size from current quota
        quota = check_quota()
        safe_quota  = int(quota * 0.75)
        batch_size  = min(MAX_BATCH, max(0, safe_quota // TOKENS_PER_ARTICLE))
        tokens_used = batch_size * TOKENS_PER_ARTICLE

        log(f"  Groq quota: {quota} tokens | Safe: {safe_quota} | Batch: {batch_size} articles")

        if batch_size == 0:
            wait_sec = int(TOKENS_PER_ARTICLE / 6000 * 60) + 90
            log(f"  Quota too low -- sleeping {wait_sec}s for recharge...")
            _time.sleep(wait_sec)
            continue

        # Build batch from pending
        batch = pending[:batch_size]
        batch_bundle = "\n".join(
            f"[ART:{j+1}] {row['english_conclusion']}"
            for j, row in enumerate(batch)
        )

        prompt = (
            f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
            f"Keep each [ART:N] marker exactly as shown in your response.\n"
            f"Each item: EXACTLY 5 complete sentences. Each sentence ends with Myanmar full stop ။\n"
            f"No extra text outside the [ART:N] sections. No disclaimers. No notes.\n\n"
            f"{batch_bundle}"
        )

        log(f"  Translating {batch_size} articles ({batch_size*5} sentences)...")
        result_text, provider = smart_gen(
            prompt, min_sent=1, max_tokens=batch_size*400, pipeline="articles")

        saved_this_loop = 0
        if result_text:
            parsed = parse_bundle(result_text, "ART")
            for j, row in enumerate(batch):
                key     = str(j + 1)
                mm_text = parsed.get(key, "")
                if mm_text and quality_ok(f"ART:{key}", mm_text, 5):
                    try:
                        supa.table("article_briefs").update({
                            "myanmar_conclusion":   mm_text,
                            "myanmar_brief":        mm_text,
                            "translation_status":   "translated",
                            "translation_provider": provider,
                        }).eq("url", row["url"]).execute()
                        # Update local map too
                        if row["url"] in url_to_row:
                            url_to_row[row["url"]]["translation_status"] = "translated"
                        log(f"    [{provider.upper()}] ART:{key} saved -- website updated!")
                        saved_this_loop += 1
                    except Exception as e:
                        log(f"    WARNING: ART:{key} save failed: {e}")
                else:
                    log(f"    ART:{key} below quality -- stays pending for next loop")

            log(f"  Loop {loop_attempt} saved: {saved_this_loop}/{batch_size} articles")
        else:
            log(f"  Translation failed -- {batch_size} articles stay pending")

        # Check remaining pending
        try:
            remaining_res = supa.table("article_briefs")\
                .select("url")\
                .eq("is_selected", True)\
                .eq("run_date", str(run_date))\
                .eq("translation_status", "pending")\
                .execute()
            remaining_count = len(remaining_res.data or [])
        except Exception:
            remaining_count = len(pending) - saved_this_loop

        if remaining_count == 0:
            log(f"  All articles translated!")
            break

        # Calculate dynamic wait time for quota recharge
        wait_sec = max(90, int(tokens_used / 6000 * 60) + 90)
        log(f"  {remaining_count} articles still pending")
        log(f"  Tokens used: {tokens_used} | Recharge wait: {wait_sec}s")

        # Check timeout before sleeping
        elapsed_min = (datetime.now(timezone.utc) - start).total_seconds() / 60
        if elapsed_min + (wait_sec / 60) >= TIMEOUT_SAFE_MIN:
            log(f"  SAFE STOP: sleeping would exceed timeout -- exiting now")
            write_signal(supa, "articles_pipeline", "needs_rerun")
            break

        log(f"  Sleeping {wait_sec}s for Groq quota recharge...")
        _time.sleep(wait_sec)

    # Final signal
    try:
        final_res = supa.table("article_briefs")\
            .select("url")\
            .eq("is_selected", True)\
            .eq("run_date", str(run_date))\
            .eq("translation_status", "pending")\
            .execute()
        still_pending = len(final_res.data or [])
    except Exception:
        still_pending = 0

    if still_pending == 0:
        write_signal(supa, "articles_pipeline", "complete")
        log(f"  Signal: articles_pipeline:complete")
    else:
        write_signal(supa, "articles_pipeline", "needs_rerun")
        log(f"  Signal: articles_pipeline:needs_rerun ({still_pending} articles pending)")
        log(f"  Management will re-dispatch when needed.")

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    try:
        trans_res = supa.table("article_briefs").select("url").eq("run_date", str(run_date)).eq("is_selected", True).eq("translation_status", "translated").execute()
        translated = len(trans_res.data or [])
    except Exception:
        translated = 0
    log(f"\n-- Pipeline 3 Articles done: {elapsed}s --")
    log(f"  Articles translated: {translated}/{len(selected)}")
    return {"success": True, "translated": translated, "article_urls": article_urls}


if __name__ == "__main__":
    from datetime import date
    supa     = get_supa()
    run_date = date.today()
    run_ts   = datetime.now(timezone.utc).isoformat()
    run_articles(supa, run_date, run_ts)
