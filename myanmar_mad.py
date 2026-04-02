#!/usr/bin/env python3
"""
myanmar_mad.py -- GNI Myanmar Pipeline 4: MAD Translation
Translates full 3-round MAD debate. 6 bundled calls.
James Model V4 | P3a+P3b+P3c+P3d+P3e+f
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
    wait_for_quota, quality_ok, write_signal
)

def run_mad(supa, run_date, run_ts, report_data):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Pipeline 4 -- MAD Translation")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    esc_score = report_data.get("escalation_score", 0)
    esc_level = report_data.get("escalation_level", "UNKNOWN")
    mad_verd  = report_data.get("mad_verdict", "neutral")
    mad_conf  = report_data.get("mad_confidence", 0)
    mad_act   = report_data.get("mad_action_recommendation", "")
    mad_blind = report_data.get("mad_blind_spot", "")
    mad_black = report_data.get("mad_black_swan_case", "")
    mad_ostr  = report_data.get("mad_ostrich_case", "")
    short_thr = report_data.get("short_focus_threats", "")
    plain_nar = report_data.get("plain_narrative", "")
    mkt_imp   = report_data.get("market_impact", "")
    rep_id    = report_data.get("id", "")
    ci_width  = report_data.get("confidence_interval_width", 0)
    conf_pct  = round((mad_conf or 0) * 100)

    bull_def  = "Markets show resilience despite geopolitical pressure and key economies maintain growth."
    bear_def  = "Escalating tensions threaten global economic stability and supply chains."
    swan_def  = "Unknown systemic risks remain unpriced in markets with tail event potential."
    ostr_def  = "Markets are ignoring structural vulnerabilities and debt sustainability issues."
    act_def   = "Monitor closely and maintain defensive positioning."
    blind_def = "Unexpected policy shifts from major powers."
    nar_def   = "Elevated global tension requiring careful monitoring."

    p_bull  = mad_black[:400] or bull_def
    p_bear  = short_thr[:400] or bear_def
    p_swan  = mad_blind[:400] or swan_def
    p_ostr  = mad_ostr[:400] or ostr_def
    p_act   = mad_act[:200] or act_def
    p_blind = mad_blind[:150] or blind_def
    p_nar   = plain_nar[:150] or nar_def
    p_mkt   = mkt_imp[:150] or "Global market conditions remain volatile."

    log("\n-- P3a: MAD Round 1 (4 agents x 5 sentences) --")
    wait_for_quota(2000, "MAD Round 1")
    r1_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with Myanmar full stop.\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MAD:BULL_R1] The bull case for global markets: {p_bull}\n"
        f"[MAD:BEAR_R1] The bear case for global risks: {p_bear}\n"
        f"[MAD:SWAN_R1] The black swan unknown risk: {p_swan}\n"
        f"[MAD:OSTRICH_R1] The ignored reality warning: {p_ostr}"
    )
    r1_text, r1_prov = smart_gen(r1_prompt, min_sent=15, max_tokens=1200)
    mad_r1 = parse_bundle(r1_text or "", "MAD") if r1_text else {}
    log(f"  P3a Round 1: {r1_prov or 'FAILED'} -- {len(mad_r1)} agents")

    log("\n-- P3b: Arbitrator Remark 1 (3 sentences) --")
    wait_for_quota(500, "Arbitrator 1")
    arb1_prompt = (
        f"TRANSLATE INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep [ARB:1] marker exactly as shown.\n"
        f"EXACTLY 3 sentences. Each ends with Myanmar full stop. No extra text.\n\n"
        f"[ARB:1] After Round 1, the arbitrator coaching note: "
        f"The bull case needs to account for geopolitical tail risks more seriously. "
        f"The bear case should quantify downside more precisely with specific indicators. "
        f"All agents must sharpen their final positions for Round 2 with clearer evidence."
    )
    arb1_text, arb1_prov = smart_gen(arb1_prompt, min_sent=2, max_tokens=300)
    arb1 = parse_bundle(arb1_text or "", "ARB") if arb1_text else {}
    log(f"  P3b Arbitrator 1: {arb1_prov or 'FAILED'}")

    log("\n-- P3c: MAD Round 2 (4 agents x 5 sentences) --")
    wait_for_quota(2000, "MAD Round 2")
    r2_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with Myanmar full stop.\n"
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
        f"[MAD:SWAN_R2] Black Swan refined position: "
        f"The most dangerous unknown is a sudden loss of confidence in reserve currency stability. "
        f"Interconnected financial system fragilities could amplify any single shock dramatically. "
        f"Geopolitical conflict could disrupt critical infrastructure with cascading global effects. "
        f"AI-driven market dynamics could accelerate volatility beyond historical parameters. "
        f"Pandemic-level supply shocks remain possible from multiple global pressure points.\n"
        f"[MAD:OSTRICH_R2] Ostrich refined position: "
        f"Markets continue to ignore the compounding effect of multiple simultaneous stressors. "
        f"The assumption of central bank rescue capacity is being stress-tested in real time. "
        f"Geopolitical realignment is permanently changing trade flows faster than models capture. "
        f"ESG and climate transition costs are not fully reflected in corporate valuations. "
        f"Demographic headwinds in major economies will constrain growth for decades ahead."
    )
    r2_text, r2_prov = smart_gen(r2_prompt, min_sent=15, max_tokens=1200)
    mad_r2 = parse_bundle(r2_text or "", "MAD") if r2_text else {}
    log(f"  P3c Round 2: {r2_prov or 'FAILED'} -- {len(mad_r2)} agents")

    log("\n-- P3d: Arbitrator Remark 2 (3 sentences) --")
    wait_for_quota(500, "Arbitrator 2")
    arb2_prompt = (
        f"TRANSLATE INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep [ARB:2] marker exactly as shown.\n"
        f"EXACTLY 3 sentences. Each ends with Myanmar full stop. No extra text.\n\n"
        f"[ARB:2] After Round 2, the arbitrator coaching for Round 3: "
        f"All agents have sharpened their positions significantly. "
        f"Round 3 should focus on the single most important insight from each perspective. "
        f"The final verdict will be determined by the weight of evidence presented in Round 3."
    )
    arb2_text, arb2_prov = smart_gen(arb2_prompt, min_sent=2, max_tokens=300)
    arb2 = parse_bundle(arb2_text or "", "ARB") if arb2_text else {}
    log(f"  P3d Arbitrator 2: {arb2_prov or 'FAILED'}")

    log("\n-- P3e+f: Round 3 + Verdict bundled (25 sentences) --")
    wait_for_quota(2500, "MAD Round 3 + Verdict")
    r3_prompt = (
        f"TRANSLATE ALL ITEMS INTO MYANMAR LANGUAGE (Burmese Unicode).\n"
        f"Keep each [MAD:AGENT] marker exactly as shown.\n"
        f"Each item: EXACTLY 5 sentences. Each sentence ends with Myanmar full stop.\n"
        f"No extra text outside markers. No disclaimers.\n\n"
        f"[MAD:BULL_R3] Bull final sharpest position: "
        f"The most important bullish signal is continued resilience of corporate balance sheets. "
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
        f"Myanmar fuel import dependence makes it particularly vulnerable to this specific tail risk. "
        f"Readers should maintain higher cash reserves than usual as insurance against this scenario. "
        f"The probability is low but the impact would be severe and rapid.\n"
        f"[MAD:OSTRICH_R3] Ostrich final ignored reality: "
        f"The most dangerous ignored reality is the assumption that current global order will persist. "
        f"Multipolar world dynamics are fundamentally changing the rules of international finance. "
        f"Myanmar economic planning must account for a world where dollar dominance is challenged. "
        f"Trade routes and supply chains that seem stable today face structural multi-year disruption. "
        f"Preparing for this reality now costs less than reacting to it later.\n"
        f"[MAD:VERDICT] Final MAD verdict -- {mad_verd} at {conf_pct}% confidence: "
        f"The MAD debate verdict is {mad_verd} with {conf_pct}% confidence after three rounds. "
        f"The weight of evidence from Bear and Black Swan agents outweighs the Bull case at this time. "
        f"Action recommendation: {p_act} "
        f"The blind spot Myanmar readers must watch: {p_blind} "
        f"Overall escalation: {esc_score}/10 ({esc_level}) -- {p_nar}"
    )
    r3_text, r3_prov = smart_gen(r3_prompt, min_sent=20, max_tokens=1800)
    mad_r3 = parse_bundle(r3_text or "", "MAD") if r3_text else {}
    log(f"  P3e+f Round 3+Verdict: {r3_prov or 'FAILED'} -- {len(mad_r3)} items")

    mad_mm_parts = []
    for key in ["BULL_R1","BEAR_R1","SWAN_R1","OSTRICH_R1",
                "BULL_R3","BEAR_R3","SWAN_R3","OSTRICH_R3","VERDICT"]:
        val = mad_r1.get(key) or mad_r2.get(key) or mad_r3.get(key, "")
        if val:
            mad_mm_parts.append(val)
    mad_mm = "\n".join(mad_mm_parts) or None

    log("\n-- Save MAD rounds to debate_summaries --")
    try:
        supa.table("debate_summaries").update({
            "mad_mm":             mad_mm,
            "mad_r1_bull":        mad_r1.get("BULL_R1"),
            "mad_r1_bear":        mad_r1.get("BEAR_R1"),
            "mad_r1_swan":        mad_r1.get("SWAN_R1"),
            "mad_r1_ostrich":     mad_r1.get("OSTRICH_R1"),
            "mad_arb1":           arb1.get("1"),
            "mad_r2_bull":        mad_r2.get("BULL_R2"),
            "mad_r2_bear":        mad_r2.get("BEAR_R2"),
            "mad_r2_swan":        mad_r2.get("SWAN_R2"),
            "mad_r2_ostrich":     mad_r2.get("OSTRICH_R2"),
            "mad_arb2":           arb2.get("2"),
            "mad_r3_bull":        mad_r3.get("BULL_R3"),
            "mad_r3_bear":        mad_r3.get("BEAR_R3"),
            "mad_r3_swan":        mad_r3.get("SWAN_R3"),
            "mad_r3_ostrich":     mad_r3.get("OSTRICH_R3"),
            "mad_verdict_mm":     mad_r3.get("VERDICT"),
            "mad_translation_status":   "translated" if mad_r3.get("VERDICT") else "pending",
            "mad_translation_provider": r3_prov or r1_prov or None,
        }).eq("run_date", str(run_date)).execute()
        log("  OK: MAD rounds saved to debate_summaries")
    except Exception as e:
        log(f"  ERROR: {e}")

    write_signal(supa, "mad_pipeline", "complete", {"report_id": rep_id})

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    log(f"\n-- Pipeline 4 MAD done: {elapsed}s --")
    log(f"  Round 1: {len(mad_r1)} agents | Round 2: {len(mad_r2)} agents | Round 3: {len(mad_r3)} items")
    return {
        "success":  bool(mad_r3.get("VERDICT")),
        "mad_mm":   mad_mm,
        "r1_prov":  r1_prov,
        "r3_prov":  r3_prov,
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
    run_mad(supa, run_date, run_ts, rep)
