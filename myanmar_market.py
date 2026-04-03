#!/usr/bin/env python3
"""
myanmar_market.py -- GNI Myanmar Pipeline 5: Market + Predictions
Translates 3 market brief fields. Predictions on-demand only.
James Model V4 | Universal Bundling [MKT:*]
Team Geeks | Session 16 | April 2026
GNI-R-194: Every prompt specifies EXACT sentence count
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import sys, json, csv, io
from datetime import datetime, timezone
from myanmar_shared import (
    log, get_supa, gni_get, smart_gen, parse_bundle,
    wait_for_quota, write_signal, tg_send, esc_emoji
)

def run_market(supa, run_date, run_ts, report_data, intel_result=None):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Pipeline 5 -- Market + Predictions Translation")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    esc_score = report_data.get("escalation_score", 0)
    esc_level = report_data.get("escalation_level", "UNKNOWN")
    mad_verd  = report_data.get("mad_verdict", "")
    mad_conf  = report_data.get("mad_confidence", 0)
    mkt_imp   = report_data.get("market_impact", "")
    rep_id    = report_data.get("id", "")
    conf_pct  = round((mad_conf or 0) * 100)

    mkt_def   = "Global commodity markets are reacting to geopolitical developments."
    forex_def = "USD strength is creating pressure on emerging market currencies."
    equity_def = "Global equity markets showing mixed signals amid geopolitical uncertainty."
    p_mkt     = mkt_imp[:300] or mkt_def

    log("\n-- P5: Market briefs bundle [MKT:*] --")
    log("  Skipping Groq quota check -- Market uses OpenRouter primary")

    market_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MKT:FIELD] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with Myanmar full stop.\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MKT:COMMODITY] Commodity market intelligence for Myanmar readers: "
        f"Market context: {p_mkt} "
        f"Oil price movements directly impact Myanmar fuel costs and import bills. "
        f"Gold prices provide a safe-haven signal that Myanmar savers should monitor. "
        f"Agricultural commodity prices affect Myanmar export revenues and food security. "
        f"Myanmar businesses dependent on imported commodities should review their cost structures.\n"
        f"[MKT:FOREX] Currency and foreign exchange intelligence: "
        f"USD strength is creating pressure on emerging market currencies including the Myanmar kyat. "
        f"Currency context: {mkt_imp[:200] or forex_def} "
        f"Myanmar importers face higher costs when the kyat weakens against the US dollar. "
        f"Regional currency movements in ASEAN are creating competitive trade dynamics. "
        f"Myanmar businesses with foreign currency exposure should review their hedging strategies.\n"
        f"[MKT:EQUITY] Stock market and equity intelligence: "
        f"Global equity markets: {mkt_imp[:200] or equity_def} "
        f"SPY and major index movements indicate the direction of global risk appetite. "
        f"Myanmar companies listed on regional exchanges should monitor correlation with global sentiment. "
        f"Foreign investment flows into ASEAN are being affected by global risk-off dynamics. "
        f"Myanmar investors should maintain diversification and avoid concentrated sector bets."
    )

    mkt_text, mkt_prov = smart_gen(market_prompt, min_sent=12, max_tokens=1500, pipeline="market")
    mkt = parse_bundle(mkt_text or "", "MKT") if mkt_text else {}
    log(f"  P5 Market bundle: {mkt_prov or 'FAILED'} -- {len(mkt)} fields")

    log("\n-- Save market_briefs --")
    for cat, mm_text in [
        ("Commodity", mkt.get("COMMODITY")),
        ("Forex",     mkt.get("FOREX")),
        ("Equity",    mkt.get("EQUITY")),
    ]:
        try:
            supa.table("market_briefs").insert({
                "run_date":      str(run_date),
                "run_timestamp": run_ts,
                "category":      cat,
                "myanmar_brief": mm_text or "",
            }).execute()
            log(f"  OK: {cat} saved")
        except Exception as e:
            log(f"  ERROR: {cat}: {e}")

    log("\n-- Export CSV/JSON --")
    try:
        reps = gni_get("/api/export/reports").get("reports", [])
        if reps:
            buf = io.StringIO()
            w = csv.DictWriter(buf, fieldnames=reps[0].keys())
            w.writeheader(); w.writerows(reps)
            supa.storage.from_("gni-myanmar-exports").upload(
                "reports.csv", buf.getvalue().encode("utf-8"),
                {"content-type": "text/csv", "upsert": "true"})
            supa.storage.from_("gni-myanmar-exports").upload(
                "reports.json",
                json.dumps(reps, ensure_ascii=False).encode("utf-8"),
                {"content-type": "application/json", "upsert": "true"})
            log("  OK: reports.csv + reports.json uploaded")
    except Exception as e:
        log(f"  WARNING: Export: {e}")

    log("\n-- Telegram notification --")
    brief_mm = (intel_result or {}).get("brief_mm", "")
    emoji    = esc_emoji(esc_level)
    tg_send(
        f"{emoji} <b>GNI Myanmar | {esc_level} {esc_score}/10</b>\n\n"
        f"MAD verdict: <b>{mad_verd.upper()}</b> ({conf_pct}% confidence)\n\n"
        f"{brief_mm or 'GNI Myanmar intelligence pipeline completed successfully.'}\n\n"
        f"<a href='https://gni-myanmar.vercel.app'>Dashboard</a> | "
        f"<a href='https://gni-myanmar.vercel.app/news'>News</a> | "
        f"<a href='https://gni-myanmar.vercel.app/intel'>Intel</a>\n\n"
        f"#GNI #Myanmar #GlobalIntelligence"
    )

    write_signal(supa, "market_pipeline", "complete", {"report_id": rep_id})

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    log(f"\n-- Pipeline 5 Market done: {elapsed}s --")
    log(f"  Provider: {mkt_prov or 'FAILED'}")
    log(f"  Fields translated: {len(mkt)}/3")
    return {
        "success":  bool(mkt),
        "provider": mkt_prov,
        "fields":   len(mkt),
    }


if __name__ == "__main__":
    from myanmar_shared import get_supa, gni_get
    from datetime import date
    supa     = get_supa()
    run_date = date.today()
    run_ts   = datetime.now(timezone.utc).isoformat()
    try:
        rep = gni_get("/api/reports").get("reports", [])[0]
    except Exception:
        rep = {}
    run_market(supa, run_date, run_ts, rep)
