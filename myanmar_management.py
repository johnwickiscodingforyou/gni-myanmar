#!/usr/bin/env python3
"""
myanmar_management.py -- GNI Myanmar Pipeline 1: Management
Conductor pipeline. Health check every 30 min.
Orchestrates Pipelines 2->3->4->5 when GNI Autonomous alert arrives.
James Model V4 | Team Geeks | Session 16 | April 2026
GNI-R-193: Never touch GNI_Autonomous pipelines without critical reason.
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import sys, time
from datetime import datetime, timezone
from myanmar_shared import (
    log, get_supa, gni_get, check_quota, write_signal,
    read_signal, wait_for_signal, tg_send, check_health
)
from myanmar_intel    import run_intel
from myanmar_articles import run_articles
from myanmar_mad      import run_mad
from myanmar_market   import run_market

PIPELINE_GAP = 120

def get_gni_signal(supa):
    try:
        res = supa.table("pipeline_signals")\
            .select("id, article_ids, report_id")\
            .eq("source", "gni-autonomous")\
            .eq("processed", False)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        if res.data:
            sig = res.data[0]
            ids = sig.get("article_ids") or []
            log(f"  OK: GNI signal found -- {len(ids)} article IDs")
            return sig["id"], ids, sig.get("report_id", "")
        log("  INFO: No unprocessed GNI signal found")
        return None, [], ""
    except Exception as e:
        log(f"  WARNING: Signal read failed: {e}")
        return None, [], ""

def mark_processed(supa, signal_id):
    if not signal_id: return
    try:
        supa.table("pipeline_signals")\
            .update({"processed": True})\
            .eq("id", signal_id)\
            .execute()
        log(f"  OK: Signal {signal_id} marked processed")
    except Exception as e:
        log(f"  WARNING: Could not mark signal: {e}")

def fetch_report(signal_report_id=""):
    try:
        reps = gni_get("/api/reports").get("reports", [])
        if reps:
            rep = reps[0]
            log(f"  OK: {rep.get('escalation_score',0)}/10 {rep.get('escalation_level','')} | {rep.get('mad_verdict','')}")
            return rep
    except Exception as e:
        log(f"  WARNING: {e}")
    return {}

def run_health_check(supa):
    log("\n-- Health Check --")
    health = check_health(supa)
    for k, v in health.items():
        status = "OK" if v in ["OK", "SET"] else "WARN"
        log(f"  [{status}] {k}: {v}")
    return health

def run_conductor(supa, signal_id, run_date, run_ts):
    start = datetime.now(timezone.utc)
    log("\n" + "=" * 60)
    log("Management Pipeline -- CONDUCTOR MODE")
    log(f"Started: {start.isoformat()}")
    log("=" * 60)

    results = {}

    log("\n-- Fetching latest report from GNI Autonomous --")
    report_data = fetch_report()

    log(f"\n-- Step 1: Pipeline 2 -- Intel Translation --")
    quota = check_quota()
    log(f"  Quota before Intel: {quota} tokens")
    try:
        results["intel"] = run_intel(supa, run_date, run_ts, report_data)
        log(f"  Intel done: {results['intel'].get('fields',0)}/5 fields")
    except Exception as e:
        log(f"  ERROR Intel: {e}")
        results["intel"] = {"success": False}

    log(f"\n  Waiting {PIPELINE_GAP}s before Articles pipeline...")
    time.sleep(PIPELINE_GAP)

    log(f"\n-- Step 2: Pipeline 3 -- Article Translation --")
    quota = check_quota()
    log(f"  Quota before Articles: {quota} tokens")
    try:
        results["articles"] = run_articles(supa, run_date, run_ts)
        log(f"  Articles done: {results['articles'].get('translated',0)}/11")
    except Exception as e:
        log(f"  ERROR Articles: {e}")
        results["articles"] = {"success": False}

    log(f"\n  Waiting {PIPELINE_GAP}s before MAD pipeline...")
    time.sleep(PIPELINE_GAP)

    log(f"\n-- Step 3: Pipeline 4 -- MAD Translation --")
    quota = check_quota()
    log(f"  Quota before MAD: {quota} tokens")
    try:
        results["mad"] = run_mad(supa, run_date, run_ts, report_data)
        log(f"  MAD done: success={results['mad'].get('success',False)}")
    except Exception as e:
        log(f"  ERROR MAD: {e}")
        results["mad"] = {"success": False}

    log(f"\n  Waiting {PIPELINE_GAP//2}s before Market pipeline...")
    time.sleep(PIPELINE_GAP // 2)

    log(f"\n-- Step 4: Pipeline 5 -- Market + Predictions --")
    quota = check_quota()
    log(f"  Quota before Market: {quota} tokens")
    try:
        results["market"] = run_market(
            supa, run_date, run_ts, report_data,
            intel_result=results.get("intel", {})
        )
        log(f"  Market done: {results['market'].get('fields',0)}/3 fields")
    except Exception as e:
        log(f"  ERROR Market: {e}")
        results["market"] = {"success": False}

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)

    log("\n" + "=" * 60)
    log("CONDUCTOR MODE COMPLETE")
    log(f"Total time: {elapsed}s")
    log(f"Intel:    {results.get('intel',{}).get('fields',0)}/5 fields")
    log(f"Articles: {results.get('articles',{}).get('translated',0)}/11 translated")
    log(f"MAD:      {results.get('mad',{}).get('success',False)}")
    log(f"Market:   {results.get('market',{}).get('fields',0)}/3 fields")
    log("=" * 60)

    mark_processed(supa, signal_id)
    return results


def run():
    start    = datetime.now(timezone.utc)
    run_date = start.date()
    run_ts   = start.isoformat()

    log("=" * 60)
    log("GNI Myanmar Management Pipeline v1")
    log(f"Started: {run_ts}")
    log("Conductor | Health Monitor | Pipeline Orchestrator")
    log("=" * 60)

    try:
        supa = get_supa()
        log("  OK: Supabase connected")
    except Exception as e:
        log(f"  ABORT: {e}"); sys.exit(1)

    run_health_check(supa)

    log("\n-- Checking for GNI Autonomous alert --")
    signal_id, article_ids, signal_report_id = get_gni_signal(supa)

    if not signal_id:
        log("  No alert found -- health check only mode")
        log("  Next check: 30 min (scheduled by myanmar_pipeline.yml)")
        elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)
        log(f"\n-- Health check done: {elapsed}s --")
        return True

    log(f"  Alert found! Starting conductor mode...")
    run_conductor(supa, signal_id, run_date, run_ts)
    return True


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
