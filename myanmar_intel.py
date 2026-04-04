#!/usr/bin/env python3
"""
myanmar_intel.py -- GNI Myanmar Pipeline 2: Intel Translation
Translates 5 intel fields FIRST (readers want Myanmar intel immediately).
James Model V4 | Universal Bundling [INTEL:*]
Team Geeks | Session 16 | April 2026
GNI-R-194: Every prompt specifies EXACT sentence count
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import sys
from datetime import datetime, timezone
from myanmar_shared import (
    log, get_supa, gni_get, smart_gen, parse_bundle,
    quality_ok, write_signal, tg_send, esc_emoji
)

def run_intel(supa, run_date, run_ts, report_data):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Pipeline 2 -- Intel Translation")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    esc_score = report_data.get("escalation_score", 0)
    esc_level = report_data.get("escalation_level", "UNKNOWN")
    mad_verd  = report_data.get("mad_verdict", "")
    mad_conf  = report_data.get("mad_confidence", 0)
    mad_act   = report_data.get("mad_action_recommendation", "")
    mad_blind = report_data.get("mad_blind_spot", "")
    plain_nar = report_data.get("plain_narrative", "")
    mkt_imp   = report_data.get("market_impact", "")
    rep_id    = report_data.get("id", "")
    ci_width  = report_data.get("confidence_interval_width", 0)
    certainty = round((1 - (ci_width or 0) / 1.6) * 100)
    conf_pct  = round((mad_conf or 0) * 100)

    log("\n-- Fetch pillars --")
    geo_p = {}; tech_p = {}; fin_p = {}
    funnel_collected = 425; funnel_selected = 11
    try:
        for p in gni_get("/api/pillar-reports").get("pillars", []):
            n = (p.get("pillar") or p.get("name", "")).upper()
            if "GEO" in n:    geo_p  = p
            elif "TECH" in n: tech_p = p
            elif "FIN" in n:  fin_p  = p
        log("  OK: Pillars loaded")
    except Exception as e:
        log(f"  WARNING: {e}")
    try:
        runs = gni_get("/api/pipeline-runs").get("runs", [{}])
        funnel_collected = runs[0].get("articles_collected", 425)
        funnel_selected  = runs[0].get("top_articles_count", 11)
        log(f"  OK: Funnel {funnel_collected} -> {funnel_selected}")
    except Exception as e:
        log(f"  WARNING: {e}")

    log("\n-- P4: Intel fields bundle [INTEL:*] --")
    log("  Skipping Groq quota check -- Intel uses Gemini primary")

    brief_def = "Global tensions remain elevated with multiple pressure points."
    act_def   = "Monitor escalation indicators closely."
    blind_def = "Regional spillover effects from global tensions."
    geo_def   = "Ongoing regional tensions affecting global stability."
    tech_def  = "Cybersecurity and AI developments reshape geopolitical landscape."
    fin_def   = "Global markets showing stress signals from geopolitical uncertainty."
    weak_def  = "Diplomatic communication gaps remain unresolved."
    techw_def = "Digital dependency creates new vulnerability vectors."

    geo_sum   = (geo_p.get("summary") or plain_nar or geo_def)[:250]
    geo_loc   = geo_p.get("location_focus", "Multiple regions")
    geo_sent  = geo_p.get("sentiment", "Bearish")
    geo_score = geo_p.get("sentiment_score", 0)
    geo_weak  = geo_p.get("weakness_identified", weak_def)
    tech_sent = tech_p.get("sentiment", "Neutral")
    tech_sum  = tech_p.get("summary", tech_def)[:200]
    tech_weak = tech_p.get("weakness_identified", techw_def)
    fin_sent  = fin_p.get("sentiment", "Bearish")
    fin_score = fin_p.get("sentiment_score", 0)
    p_brief   = plain_nar[:200] or brief_def
    p_act     = mad_act[:150] or act_def
    p_blind   = mad_blind[:100] or blind_def
    p_mkt     = mkt_imp[:200] or fin_def

    intel_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [INTEL:FIELD] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with Myanmar full stop.\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[INTEL:BRIEF] Most important intelligence summary today: "
        f"Escalation level is {esc_score}/10 ({esc_level}) with {certainty}% model certainty. "
        f"MAD debate verdict: {mad_verd} with {conf_pct}% confidence. "
        f"Key finding: {p_brief} "
        f"Action recommendation: {p_act} "
        f"Myanmar readers should watch: {p_blind}\n"
        f"[INTEL:FUNNEL] How GNI intelligence pipeline works today: "
        f"GNI collected {funnel_collected} articles from 25 international RSS news sources today. "
        f"AI quality filters selected the best {funnel_selected} articles based on geopolitical relevance. "
        f"Each selected article was analyzed for escalation signals, market impact, and Myanmar relevance. "
        f"The pipeline runs automatically twice per day at 02:00 and 10:00 UTC. "
        f"This ensures Myanmar readers receive fresh intelligence every morning and evening.\n"
        f"[INTEL:GEO] Geopolitical pillar analysis: "
        f"Main geopolitical event: {geo_sum} "
        f"Countries involved: {geo_loc}. "
        f"Sentiment: {geo_sent} with score {geo_score:.2f}. "
        f"ASEAN implications require careful monitoring by Myanmar policymakers and businesses. "
        f"Key weakness identified: {geo_weak}\n"
        f"[INTEL:TECH] Technology and cyber intelligence: "
        f"Technology pillar sentiment: {tech_sent} today. "
        f"Summary: {tech_sum} "
        f"Cyber threats and AI surveillance capabilities are expanding across the region. "
        f"Myanmar digital infrastructure should strengthen resilience against evolving threats. "
        f"Key technology risk: {tech_weak}\n"
        f"[INTEL:FIN] Financial and market intelligence: "
        f"Financial pillar sentiment: {fin_sent} with score {fin_score:.2f}. "
        f"Market impact: {p_mkt} "
        f"Oil and gold price movements directly affect Myanmar import costs and reserves. "
        f"USD strength creates additional pressure on Myanmar kyat exchange rates. "
        f"Myanmar businesses should hedge currency exposure and monitor commodity prices closely."
    )

    intel_text, intel_prov = smart_gen(intel_prompt, min_sent=20, max_tokens=2000, pipeline="intel")
    intel = parse_bundle(intel_text or "", "INTEL") if intel_text else {}
    log(f"  P4 Intel bundle: {intel_prov or 'FAILED'} -- {len(intel)} fields")

    funnel_mm  = intel.get("FUNNEL")
    primary_mm = intel.get("BRIEF")
    geo_mm     = intel.get("GEO")
    tech_mm    = intel.get("TECH")
    fin_mm     = intel.get("FIN")
    brief_mm   = intel.get("BRIEF")

    log("\n-- Save intel fields to debate_summaries --")
    try:
        supa.table("debate_summaries").upsert({
            "run_date":         str(run_date),
            "run_timestamp":    run_ts,
            "report_id":        rep_id,
            "mad_verdict":      mad_verd,
            "mad_confidence":   float(mad_conf) if mad_conf else None,
            "escalation_score": float(esc_score) if esc_score else None,
            "escalation_level": esc_level,
            "funnel_mm":        funnel_mm,
            "primary_mm":       primary_mm,
            "geo_mm":           geo_mm,
            "tech_mm":          tech_mm,
            "fin_mm":           fin_mm,
            "brief_mm":         brief_mm,
            "pipeline_success": True,
        }, on_conflict="run_date").execute()
        log("  OK: Intel fields saved to debate_summaries")
    except Exception as e:
        log(f"  ERROR: {e}")

    write_signal(supa, "intel_pipeline", "complete", {"report_id": rep_id})

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    log(f"\n-- Pipeline 2 Intel done: {elapsed}s --")
    log(f"  Provider: {intel_prov or 'FAILED'}")
    log(f"  Fields translated: {len(intel)}/5")

    return {
        "success":   bool(intel),
        "provider":  intel_prov,
        "fields":    len(intel),
        "brief_mm":  brief_mm,
        "rep_id":    rep_id,
        "esc_score": esc_score,
        "esc_level": esc_level,
        "mad_verd":  mad_verd,
        "mad_conf":  mad_conf,
        "mad_act":   mad_act,
        "mad_blind": mad_blind,
        "plain_nar": plain_nar,
        "mkt_imp":   mkt_imp,
        "ci_width":  ci_width,
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
    run_intel(supa, run_date, run_ts, rep)
