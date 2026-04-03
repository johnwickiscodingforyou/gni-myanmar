#!/usr/bin/env python3
"""
myanmar_mad.py -- GNI Myanmar Pipeline 4: MAD Translation
Translates full 3-round MAD debate. 15 individual agent calls.
James Model V4 | Per-Agent Split (GNI-R-208)
Team Geeks | Session 16-17-18-19 | April 2026
GNI-R-194: Every prompt specifies EXACT sentence count
GNI-R-205: Each pipeline checks quota for its OWN primary only
CRITICAL FILE -- Do NOT delete. See GNI-R-192.

S17 CHANGES:
- Round-by-round pending tracking (Q4 decision)
- 30s sleep between rounds (Q5 decision)
- 22min safety stop + needs_rerun signal (Q7 decision)
- Skip completed rounds on rerun
- Save each round immediately -- website updates live

S18 CHANGES:
- Per-agent split: each agent = 1 smart_gen() call (~300 tokens each)
- No more bundle calls -- llama3.1-8b handles single agents perfectly
- Uses REAL content from report_data (mad_round1_positions etc)
  instead of hardcoded English placeholder text
- No parse_bundle() for agents -- response IS the translation directly
- Arb1 + Arb2 stay as single calls (already small, keep [ARB:N] tags)
- Verdict = separate standalone call
- Total: 15 smart_gen() calls (4+1+4+1+4+1)

S19 CHANGES (3 fixes applied):
- A1: max_tokens 350->500 in _translate_agent() -- llama3.1-8b needs room for 5 sentences
- A1: Stronger prompt wording -- "Write all 5. Do not stop early."
- A2: Added .eq("report_id", rep_id) to ALL 7 .update() calls -- prevents multi-row contamination
- A3: Added minimum length guard (len < 20) in _translate_agent() -- prevents garbage short strings
"""

import sys, time
from datetime import datetime, timezone
from myanmar_shared import (
    log, get_supa, gni_get, smart_gen, parse_bundle,
    quality_ok, write_signal
)

ROUND_SLEEP   = 30    # seconds between rounds (Cerebras conservative)
AGENT_SLEEP   = 5     # seconds between individual agent calls
TIMEOUT_SAFE  = 22    # stop before 25min YML timeout

def _elapsed_min(start):
    return (datetime.now(timezone.utc) - start).total_seconds() / 60

def _check_timeout(start, label):
    if _elapsed_min(start) >= TIMEOUT_SAFE:
        log(f"  SAFE STOP at {label}: {_elapsed_min(start):.1f} min -- approaching timeout")
        return True
    return False

def _fetch_existing(supa, run_date):
    """Fetch already-translated MAD fields from debate_summaries."""
    try:
        res = supa.table("debate_summaries")\
            .select("mad_r1_bull,mad_arb1,mad_r2_bull,mad_arb2,mad_r3_bull,mad_verdict_mm")\
            .eq("run_date", str(run_date))\
            .limit(1).execute()
        return res.data[0] if res.data else {}
    except Exception:
        return {}

def _translate_agent(label, english_text, round_num, agent_sleep=True):
    """
    Translate a single agent statement to Myanmar.
    Returns Myanmar text string or None if failed.
    No parse_bundle() needed -- response IS the translation.

    S19-A1: max_tokens increased 350->500 (llama3.1-8b needs room for 5 full sentences)
    S19-A1: Stronger prompt wording -- do not stop early
    S19-A3: Minimum length guard -- skip garbage short strings
    """
    # S19-A3: Guard against empty or too-short content
    if not english_text or not english_text.strip():
        log(f"    [{label}] No English text -- skipping")
        return None
    if len(english_text.strip()) < 20:
        log(f"    [{label}] Text too short ({len(english_text.strip())} chars) -- skipping")
        return None

    # S19-A1: Stronger prompt -- "Write all 5. Do not stop early."
    prompt = (
        f"Translate the following into Myanmar language (Burmese Unicode).\n"
        f"Write EXACTLY 5 complete sentences. Write all 5. Do not stop early.\n"
        f"Each sentence ends with Myanmar full stop ။\n"
        f"No disclaimers. No notes. No extra text. Just the translation.\n\n"
        f"{english_text.strip()}"
    )

    # S19-A1: max_tokens increased from 350 to 500
    text, prov = smart_gen(prompt, min_sent=1, max_tokens=500, pipeline="mad")
    if text:
        log(f"    [{label}] OK ({prov}) -- {len(text)} chars")
        if agent_sleep:
            time.sleep(AGENT_SLEEP)
        return text
    else:
        log(f"    [{label}] FAILED -- will stay pending")
        return None

def _translate_arb(label, arb_coaching_dict):
    """
    Translate arbitrator coaching summary.
    arb_coaching_dict = {"bull": "...", "bear": "...", "black_swan": "...", "ostrich": "..."}
    Bundles all 4 coaching notes into one readable summary for Myanmar readers.
    Uses [ARB:N] tag -- keeps parse_bundle() for this call.
    """
    bull_note  = (arb_coaching_dict.get("bull", "") or "")[:200]
    bear_note  = (arb_coaching_dict.get("bear", "") or "")[:200]
    swan_note  = (arb_coaching_dict.get("black_swan", "") or "")[:200]
    ostr_note  = (arb_coaching_dict.get("ostrich", "") or "")[:200]

    # Build a coherent English summary of the arbitrator coaching
    summary = (
        f"The arbitrator reviewed Round {label[-1]} and provided coaching to all agents. "
        f"To the Bull agent: {bull_note} "
        f"To the Bear agent: {bear_note} "
        f"To the Black Swan agent: {swan_note} "
        f"To the Ostrich agent: {ostr_note}"
    )

    prompt = (
        f"Translate the following into Myanmar language (Burmese Unicode).\n"
        f"Keep the [ARB:{label[-1]}] marker exactly as shown.\n"
        f"Write EXACTLY 5 complete sentences. Write all 5. Do not stop early.\n"
        f"Each sentence ends with Myanmar full stop ။\n"
        f"No disclaimers. No extra text outside the marker.\n\n"
        f"[ARB:{label[-1]}] {summary}"
    )

    text, prov = smart_gen(prompt, min_sent=1, max_tokens=400, pipeline="mad")
    if text:
        parsed = parse_bundle(text, "ARB")
        arb_mm = parsed.get(str(label[-1]), text)  # fallback to full text if tag missing
        log(f"    [{label}] OK ({prov})")
        return arb_mm
    else:
        log(f"    [{label}] FAILED")
        return None


def run_mad(supa, run_date, run_ts, report_data):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Pipeline 4 -- MAD Translation (Per-Agent Split S18, Fixes S19)")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    # ── Extract fields from report_data ──────────────────────────
    esc_score = report_data.get("escalation_score", 0)
    esc_level = report_data.get("escalation_level", "UNKNOWN")
    mad_verd  = report_data.get("mad_verdict", "neutral")
    mad_conf  = report_data.get("mad_confidence", 0)
    mad_act   = report_data.get("mad_action_recommendation", "")
    mad_blind = report_data.get("mad_blind_spot", "")
    plain_nar = report_data.get("plain_narrative", "")
    rep_id    = report_data.get("id", "")
    conf_pct  = round((mad_conf or 0) * 100)

    # ── Real agent positions from GNI Autonomous ─────────────────
    # These are the ACTUAL debate positions, not placeholders
    r1_pos = report_data.get("mad_round1_positions") or {}
    r2_pos = report_data.get("mad_round2_positions") or {}
    r3_pos = report_data.get("mad_round3_positions") or {}
    arb_fb = report_data.get("mad_arb_feedbacks") or {}
    arb1_dict = arb_fb.get("round1") or {}
    arb2_dict = arb_fb.get("round2") or {}

    # Fallback defaults if positions not available
    bull_def  = "Markets show resilience despite geopolitical pressure and key economies maintain growth."
    bear_def  = "Escalating tensions threaten global economic stability and supply chains."
    swan_def  = "Unknown systemic risks remain unpriced in markets with tail event potential."
    ostr_def  = "Markets are ignoring structural vulnerabilities and debt sustainability issues."
    act_def   = "Monitor closely and maintain defensive positioning."
    blind_def = "Unexpected policy shifts from major powers."
    nar_def   = "Elevated global tension requiring careful monitoring."

    # R1 agent English texts
    bull_r1_en = r1_pos.get("bull", "")     or report_data.get("mad_black_swan_case", "")[:400] or bull_def
    bear_r1_en = r1_pos.get("bear", "")     or report_data.get("short_focus_threats", "")[:400] or bear_def
    swan_r1_en = r1_pos.get("black_swan","")or report_data.get("mad_blind_spot", "")[:400]      or swan_def
    ostr_r1_en = r1_pos.get("ostrich", "") or report_data.get("mad_ostrich_case", "")[:400]    or ostr_def

    # R2 agent English texts
    bull_r2_en = r2_pos.get("bull", "")      or bull_r1_en
    bear_r2_en = r2_pos.get("bear", "")      or bear_r1_en
    swan_r2_en = r2_pos.get("black_swan", "") or swan_r1_en
    ostr_r2_en = r2_pos.get("ostrich", "")   or ostr_r1_en

    # R3 agent English texts -- GNI Autonomous saves R3 as the final positions
    bull_r3_en = r3_pos.get("bull", "")      or report_data.get("mad_bull_case", "")  or bull_r2_en
    bear_r3_en = r3_pos.get("bear", "")      or report_data.get("mad_bear_case", "")  or bear_r2_en
    swan_r3_en = r3_pos.get("black_swan", "") or report_data.get("mad_black_swan_case","") or swan_r2_en
    ostr_r3_en = r3_pos.get("ostrich", "")   or report_data.get("mad_ostrich_case", "")  or ostr_r2_en

    # Verdict English text
    verdict_en = (
        f"The MAD debate verdict is {mad_verd} with {conf_pct}% confidence after three rounds. "
        f"Action recommendation: {mad_act or act_def} "
        f"The key blind spot Myanmar readers must watch: {mad_blind or blind_def} "
        f"Overall escalation: {esc_score}/10 ({esc_level}). "
        f"Intelligence summary: {plain_nar[:150] or nar_def}"
    )

    # ── Check which rounds already done (skip on rerun) ───────────
    existing = _fetch_existing(supa, run_date)
    log(f"  Existing: R1={'done' if existing.get('mad_r1_bull') else 'pending'} | "
        f"Arb1={'done' if existing.get('mad_arb1') else 'pending'} | "
        f"R2={'done' if existing.get('mad_r2_bull') else 'pending'} | "
        f"Arb2={'done' if existing.get('mad_arb2') else 'pending'} | "
        f"R3={'done' if existing.get('mad_r3_bull') else 'pending'} | "
        f"Verdict={'done' if existing.get('mad_verdict_mm') else 'pending'}")
    log(f"  report_id: {rep_id or 'WARNING: EMPTY -- check report_data!'}")

    # ── Track results ─────────────────────────────────────────────
    r1_prov = None
    r3_prov = None

    # ====================================================================
    # P3a: ROUND 1 -- 4 individual agent calls
    # ====================================================================
    if existing.get("mad_r1_bull"):
        log("\n-- P3a: Round 1 ALREADY DONE -- skipping --")
    else:
        log("\n-- P3a: Round 1 -- 4 individual agent calls --")
        if _check_timeout(start, "P3a"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_r1"}

        bull_r1_mm = _translate_agent("BULL_R1",    bull_r1_en, 1)
        bear_r1_mm = _translate_agent("BEAR_R1",    bear_r1_en, 1)
        swan_r1_mm = _translate_agent("SWAN_R1",    swan_r1_en, 1)
        ostr_r1_mm = _translate_agent("OSTRICH_R1", ostr_r1_en, 1, agent_sleep=False)

        if any([bull_r1_mm, bear_r1_mm, swan_r1_mm, ostr_r1_mm]):
            r1_prov = "cerebras"
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_r1_bull":    bull_r1_mm,
                    "mad_r1_bear":    bear_r1_mm,
                    "mad_r1_swan":    swan_r1_mm,
                    "mad_r1_ostrich": ostr_r1_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                saved = sum(1 for x in [bull_r1_mm, bear_r1_mm, swan_r1_mm, ostr_r1_mm] if x)
                log(f"  OK: R1 saved {saved}/4 agents -- website updated!")
            except Exception as e:
                log(f"  WARNING: R1 save: {e}")
        else:
            log("  WARNING: R1 all agents failed")

        log(f"  Sleeping {ROUND_SLEEP}s before Arbitrator 1...")
        time.sleep(ROUND_SLEEP)

    # ====================================================================
    # P3b: ARBITRATOR 1 -- single call (coaching summary)
    # ====================================================================
    if existing.get("mad_arb1"):
        log("\n-- P3b: Arbitrator 1 ALREADY DONE -- skipping --")
    else:
        log("\n-- P3b: Arbitrator 1 coaching summary --")
        if _check_timeout(start, "P3b"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_arb1"}

        if arb1_dict:
            arb1_mm = _translate_arb("ARB1", arb1_dict)
        else:
            # Fallback if arb_feedbacks not in report_data
            arb1_fallback = (
                "After Round 1, the arbitrator provided coaching to all agents. "
                "The bull case needs to account for geopolitical tail risks more seriously. "
                "The bear case should quantify downside more precisely with specific indicators. "
                "The black swan agent should focus on weak signals others are dismissing. "
                "All agents must sharpen their final positions for Round 2 with clearer evidence."
            )
            arb1_mm = _translate_agent("ARB1", arb1_fallback, 1, agent_sleep=False)

        if arb1_mm:
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_arb1": arb1_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                log("  OK: Arb1 saved -- website updated!")
            except Exception as e:
                log(f"  WARNING: Arb1 save: {e}")

        log(f"  Sleeping {ROUND_SLEEP}s before Round 2...")
        time.sleep(ROUND_SLEEP)

    # ====================================================================
    # P3c: ROUND 2 -- 4 individual agent calls
    # ====================================================================
    if existing.get("mad_r2_bull"):
        log("\n-- P3c: Round 2 ALREADY DONE -- skipping --")
    else:
        log("\n-- P3c: Round 2 -- 4 individual agent calls --")
        if _check_timeout(start, "P3c"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_r2"}

        bull_r2_mm = _translate_agent("BULL_R2",    bull_r2_en, 2)
        bear_r2_mm = _translate_agent("BEAR_R2",    bear_r2_en, 2)
        swan_r2_mm = _translate_agent("SWAN_R2",    swan_r2_en, 2)
        ostr_r2_mm = _translate_agent("OSTRICH_R2", ostr_r2_en, 2, agent_sleep=False)

        if any([bull_r2_mm, bear_r2_mm, swan_r2_mm, ostr_r2_mm]):
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_r2_bull":    bull_r2_mm,
                    "mad_r2_bear":    bear_r2_mm,
                    "mad_r2_swan":    swan_r2_mm,
                    "mad_r2_ostrich": ostr_r2_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                saved = sum(1 for x in [bull_r2_mm, bear_r2_mm, swan_r2_mm, ostr_r2_mm] if x)
                log(f"  OK: R2 saved {saved}/4 agents -- website updated!")
            except Exception as e:
                log(f"  WARNING: R2 save: {e}")
        else:
            log("  WARNING: R2 all agents failed")

        log(f"  Sleeping {ROUND_SLEEP}s before Arbitrator 2...")
        time.sleep(ROUND_SLEEP)

    # ====================================================================
    # P3d: ARBITRATOR 2 -- single call (coaching summary)
    # ====================================================================
    if existing.get("mad_arb2"):
        log("\n-- P3d: Arbitrator 2 ALREADY DONE -- skipping --")
    else:
        log("\n-- P3d: Arbitrator 2 coaching summary --")
        if _check_timeout(start, "P3d"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_arb2"}

        if arb2_dict:
            arb2_mm = _translate_arb("ARB2", arb2_dict)
        else:
            arb2_fallback = (
                "After Round 2, the arbitrator coached all agents for their final positions. "
                "All agents have sharpened their positions significantly through two rounds. "
                "Round 3 should focus on the single most important insight from each perspective. "
                "The final verdict will be determined by the weight of evidence in Round 3. "
                "Agents must commit to their clearest and most specific final position."
            )
            arb2_mm = _translate_agent("ARB2", arb2_fallback, 2, agent_sleep=False)

        if arb2_mm:
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_arb2": arb2_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                log("  OK: Arb2 saved -- website updated!")
            except Exception as e:
                log(f"  WARNING: Arb2 save: {e}")

        log(f"  Sleeping {ROUND_SLEEP}s before Round 3...")
        time.sleep(ROUND_SLEEP)

    # ====================================================================
    # P3e: ROUND 3 -- 4 individual agent calls (NO arbitrator after)
    # ====================================================================
    if existing.get("mad_r3_bull"):
        log("\n-- P3e: Round 3 ALREADY DONE -- skipping --")
    else:
        log("\n-- P3e: Round 3 -- 4 individual agent calls (final positions) --")
        if _check_timeout(start, "P3e"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_r3"}

        bull_r3_mm = _translate_agent("BULL_R3",    bull_r3_en, 3)
        bear_r3_mm = _translate_agent("BEAR_R3",    bear_r3_en, 3)
        swan_r3_mm = _translate_agent("SWAN_R3",    swan_r3_en, 3)
        ostr_r3_mm = _translate_agent("OSTRICH_R3", ostr_r3_en, 3, agent_sleep=False)

        if any([bull_r3_mm, bear_r3_mm, swan_r3_mm, ostr_r3_mm]):
            r3_prov = "cerebras"
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_r3_bull":    bull_r3_mm,
                    "mad_r3_bear":    bear_r3_mm,
                    "mad_r3_swan":    swan_r3_mm,
                    "mad_r3_ostrich": ostr_r3_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                saved = sum(1 for x in [bull_r3_mm, bear_r3_mm, swan_r3_mm, ostr_r3_mm] if x)
                log(f"  OK: R3 saved {saved}/4 agents -- website updated!")
            except Exception as e:
                log(f"  WARNING: R3 save: {e}")
        else:
            log("  WARNING: R3 all agents failed")

        log(f"  Sleeping {ROUND_SLEEP}s before Verdict...")
        time.sleep(ROUND_SLEEP)

    # ====================================================================
    # P3f: VERDICT -- standalone single call (separate from R3)
    # ====================================================================
    if existing.get("mad_verdict_mm"):
        log("\n-- P3f: Verdict ALREADY DONE -- skipping --")
        verdict_done = True
    else:
        log("\n-- P3f: Verdict -- standalone call --")
        if _check_timeout(start, "P3f"):
            write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
            return {"success": False, "reason": "timeout_before_verdict"}

        verdict_mm = _translate_agent("VERDICT", verdict_en, 0, agent_sleep=False)
        verdict_done = False

        if verdict_mm:
            try:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_verdict_mm":           verdict_mm,
                    "mad_translation_status":   "translated",
                    "mad_translation_provider": r3_prov or r1_prov or "cerebras",
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                log("  OK: Verdict saved -- website updated!")
                verdict_done = True
            except Exception as e:
                log(f"  WARNING: Verdict save: {e}")
        else:
            log("  WARNING: Verdict translation failed")

    # ====================================================================
    # FINAL: Assemble mad_mm summary
    # ====================================================================
    log("\n-- Final: Assemble full MAD summary --")
    try:
        res = supa.table("debate_summaries")\
            .select("mad_r1_bull,mad_r1_bear,mad_r1_swan,mad_r1_ostrich,"
                    "mad_r3_bull,mad_r3_bear,mad_r3_swan,mad_r3_ostrich,mad_verdict_mm")\
            .eq("run_date", str(run_date)).eq("report_id", rep_id).limit(1).execute()
        if res.data:
            row = res.data[0]
            parts = [
                row.get("mad_r1_bull",""),   row.get("mad_r1_bear",""),
                row.get("mad_r1_swan",""),   row.get("mad_r1_ostrich",""),
                row.get("mad_r3_bull",""),   row.get("mad_r3_bear",""),
                row.get("mad_r3_swan",""),   row.get("mad_r3_ostrich",""),
                row.get("mad_verdict_mm",""),
            ]
            mad_mm = "\n".join(p for p in parts if p) or None
            if mad_mm:
                # S19-A2: Added .eq("report_id", rep_id) to target correct row
                supa.table("debate_summaries").update({
                    "mad_mm": mad_mm,
                }).eq("run_date", str(run_date)).eq("report_id", rep_id).execute()
                log("  OK: mad_mm assembled and saved")
    except Exception as e:
        log(f"  WARNING: Final assembly: {e}")
        mad_mm = None

    # ====================================================================
    # SIGNAL
    # ====================================================================
    if verdict_done:
        write_signal(supa, "mad_pipeline", "complete", {"report_id": rep_id})
        log("  Signal: mad_pipeline:complete")
    else:
        write_signal(supa, "mad_pipeline", "needs_rerun", {"report_id": rep_id})
        log("  Signal: mad_pipeline:needs_rerun -- management will re-dispatch")

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
    log(f"\n-- Pipeline 4 MAD done: {elapsed}s --")
    log(f"  Verdict done: {verdict_done}")
    log(f"  R1 provider: {r1_prov or 'see logs'}")
    log(f"  R3 provider: {r3_prov or 'see logs'}")
    return {
        "success": verdict_done,
        "r1_prov": r1_prov,
        "r3_prov": r3_prov,
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
