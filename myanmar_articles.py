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
    valid = [r for r in article_rows if r["is_selected"] and r.get("english_conclusion")]

    if valid:
        quota = check_quota()
        batch_size = max(1, min(11, int(quota * 0.7 / 600)))
        log(f"  Quota: {quota} tokens. Batch size: {batch_size} articles.")

        start_idx = 0
        while start_idx < len(valid):
            end_idx   = min(start_idx + batch_size, len(valid))
            batch     = valid[start_idx:end_idx]
            batch_num = list(range(start_idx + 1, end_idx + 1))

            batch_bundle = "\n".join(
                f"[ART:{batch_num[j]}] {batch[j]['english_conclusion']}"
                for j in range(len(batch))
            )

            prompt = (
                f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
                f"Keep each [ART:N] marker exactly as shown in your response.\n"
                f"Each item: EXACTLY 5 complete sentences. Each sentence ends with Myanmar full stop.\n"
                f"No extra text outside the [ART:N] sections. No disclaimers. No notes.\n\n"
                f"{batch_bundle}"
            )

            log(f"  Translating articles {batch_num[0]}-{batch_num[-1]} ({len(batch)*5} sentences)...")
            result_text, provider = smart_gen(prompt, min_sent=len(batch)*3, max_tokens=len(batch)*300, pipeline="articles")

            if result_text:
                parsed = parse_bundle(result_text, "ART")
                for j, row in enumerate(batch):
                    key     = str(batch_num[j])
                    mm_text = parsed.get(key, "")
                    if mm_text and quality_ok(f"ART:{key}", mm_text, 4):
                        row["myanmar_conclusion"]   = mm_text
                        row["myanmar_brief"]        = mm_text
                        row["translation_status"]   = "translated"
                        row["translation_provider"] = provider
                        try:
                            supa.table("article_briefs").update({
                                "myanmar_conclusion":   mm_text,
                                "myanmar_brief":        mm_text,
                                "translation_status":   "translated",
                                "translation_provider": provider,
                            }).eq("url", row["url"]).execute()
                            log(f"    [{provider.upper()}] ART:{key} saved")
                        except Exception as e:
                            log(f"    WARNING: ART:{key} save failed: {e}")
            else:
                log(f"  WARNING: Batch {batch_num[0]}-{batch_num[-1]} failed all providers")

            start_idx = end_idx
            if start_idx < len(valid):
                log("  Batch done. Waiting 10s before next batch...")
                import time; time.sleep(10)

    write_signal(supa, "articles_pipeline", "complete")

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    translated = sum(1 for r in article_rows if r.get("translation_status") == "translated")
    log(f"\n-- Pipeline 3 Articles done: {elapsed}s --")
    log(f"  Articles translated: {translated}/{len(selected)}")
    return {"success": True, "translated": translated, "article_urls": article_urls}


if __name__ == "__main__":
    from datetime import date
    supa     = get_supa()
    run_date = date.today()
    run_ts   = datetime.now(timezone.utc).isoformat()
    run_articles(supa, run_date, run_ts)
