#!/usr/bin/env python3
"""
myanmar_management.py -- GNI Myanmar Pipeline 1: Management
Conductor pipeline. Health check every 30 min.
S17: Now dispatches Pipelines 2+3+4+5 IN PARALLEL via GitHub Actions API.
All 4 pipelines run simultaneously = ~15 min total (was 60 min sequential).
James Model V4 | Team Geeks | Session 17 | April 2026
GNI-R-193: Never touch GNI_Autonomous pipelines without critical reason.
GNI-R-198: Double quotes only inside heredoc
GNI-R-199: No strftime format codes -- use isoformat()
CRITICAL FILE -- Do NOT delete. See GNI-R-192.
"""

import os, sys, time, requests
from datetime import datetime, timezone
from myanmar_shared import (
    log, get_supa, gni_get, check_quota,
    read_signal, write_signal, tg_send,
    check_health, esc_emoji
)

GITHUB_REPO  = "johnwickiscodingforyou/gni-myanmar"
DISPATCH_PAT = os.getenv("MYANMAR_DISPATCH_PAT", "")
GITHUB_API   = "https://api.github.com"

# Pipelines to dispatch + their signal source names
PIPELINES = [
    ("myanmar_intel.yml",    "intel_pipeline"),
    ("myanmar_articles.yml", "articles_pipeline"),
    ("myanmar_mad.yml",      "mad_pipeline"),
    ("myanmar_market.yml",   "market_pipeline"),
]


def dispatch_workflow(workflow_file, inputs=None):
    """Fire a GitHub Actions workflow_dispatch event."""
    if not DISPATCH_PAT:
        log(f"  WARNING: MYANMAR_DISPATCH_PAT not set -- cannot dispatch {workflow_file}")
        return False
    url = f"{GITHUB_API}/repos/{GITHUB_REPO}/actions/workflows/{workflow_file}/dispatches"
    payload = {"ref": "main"}
    if inputs:
        payload["inputs"] = inputs
    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {DISPATCH_PAT}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json=payload,
        timeout=15,
    )
    if r.status_code == 204:
        log(f"  OK: Dispatched {workflow_file}")
        return True
    else:
        log(f"  WARNING: Dispatch failed {workflow_file} -- HTTP {r.status_code}: {r.text[:120]}")
        return False


def wait_all_pipelines(supa, timeout_min=45, poll_sec=30):
    """
    Poll pipeline_signals until all 4 pipelines report complete.
    Returns dict of {source: signal_row} for completed pipelines.
    """
    sources   = {yml: src for yml, src in PIPELINES}
    pending   = set(src for _, src in PIPELINES)
    completed = {}
    waited    = 0
    max_wait  = timeout_min * 60

    log(f"\n  Waiting for all 4 pipelines (max {timeout_min} min, poll every {poll_sec}s)...")

    while pending and waited < max_wait:
        time.sleep(poll_sec)
        waited += poll_sec

        for source in list(pending):
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
                    sig = res.data[0]
                    supa.table("pipeline_signals")\
                        .update({"processed": True})\
                        .eq("id", sig["id"])\
                        .execute()
                    completed[source] = sig
                    pending.discard(source)
                    log(f"  OK: {source} complete ({waited//60}m {waited%60}s elapsed)")
            except Exception as e:
                log(f"  WARNING: Signal check {source}: {e}")

        if pending:
            log(f"  Still waiting: {sorted(pending)} ({waited//60}m elapsed)")

    if pending:
        log(f"  TIMEOUT: {sorted(pending)} did not complete in {timeout_min} min. Proceeding.")
    else:
        log(f"  All 4 pipelines completed in {waited//60}m {waited%60}s!")

    return completed


def get_gni_signal(supa):
    """Read unprocessed GNI Autonomous alert from pipeline_signals."""
    try:
        res = supa.table("pipeline_signals")\
            .select("id, article_ids, report_id")\
            .eq("source", "gni-autonomous")\
            .eq("processed", False)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        if res.data:
            sig  = res.data[0]
            ids  = sig.get("article_ids") or []
            log(f"  OK: GNI signal found -- {len(ids)} article IDs")
            return sig["id"], ids, sig.get("report_id", "")
        log("  INFO: No unprocessed GNI signal found")
        return None, [], ""
    except Exception as e:
        log(f"  WARNING: Signal read failed: {e}")
        return None, [], ""


def mark_processed(supa, signal_id):
    if not signal_id:
        return
    try:
        supa.table("pipeline_signals")\
            .update({"processed": True})\
            .eq("id", signal_id)\
            .execute()
        log(f"  OK: Signal {signal_id} marked processed")
    except Exception as e:
        log(f"  WARNING: Could not mark signal: {e}")


def fetch_report():
    try:
        reps = gni_get("/api/reports").get("reports", [])
        if reps:
            rep = reps[0]
            log(f"  OK: {rep.get('escalation_score',0)}/10 "
                f"{rep.get('escalation_level','')} | {rep.get('mad_verdict','')}")
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
    log("Management Pipeline -- CONDUCTOR MODE (PARALLEL)")
    log(f"Started: {start.isoformat()}")
    log("Dispatching all 4 pipelines simultaneously...")
    log("=" * 60)

    log("\n-- Fetching latest report from GNI Autonomous --")
    report_data = fetch_report()
    esc_score   = report_data.get("escalation_score", 0)
    esc_level   = report_data.get("escalation_level", "UNKNOWN")
    mad_verd    = report_data.get("mad_verdict", "")
    mad_conf    = report_data.get("mad_confidence", 0)
    conf_pct    = round((mad_conf or 0) * 100)

    log("\n-- Dispatching all 4 pipelines in parallel --")
    dispatched = []
    for workflow_file, source in PIPELINES:
        ok = dispatch_workflow(workflow_file)
        if ok:
            dispatched.append(source)
        time.sleep(2)  # small gap to avoid GitHub API rate limit

    log(f"\n  Dispatched: {len(dispatched)}/4 pipelines")
    log(f"  {dispatched}")

    if not dispatched:
        log("  ERROR: No pipelines dispatched. DISPATCH_PAT may be invalid.")
        log("  Marking signal processed and exiting.")
        mark_processed(supa, signal_id)
        return {}

    log("\n-- Monitoring pipeline_signals for completion --")
    completed = wait_all_pipelines(supa, timeout_min=45, poll_sec=30)

    elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 2)

    log("\n" + "=" * 60)
    log("CONDUCTOR MODE COMPLETE")
    log(f"Total time: {elapsed}s ({round(elapsed/60, 1)} min)")
    log(f"Completed: {len(completed)}/4 pipelines")
    for src in [s for _, s in PIPELINES]:
        status = "DONE" if src in completed else "TIMEOUT/MISSING"
        log(f"  {src}: {status}")
    log("=" * 60)

    mark_processed(supa, signal_id)

    log("\n-- Telegram summary --")
    emoji = esc_emoji(esc_level)
    done_count = len(completed)
    tg_send(
        f"{emoji} <b>GNI Myanmar | {esc_level} {esc_score}/10</b>\n\n"
        f"MAD verdict: <b>{mad_verd.upper()}</b> ({conf_pct}% confidence)\n\n"
        f"Parallel pipeline complete: {done_count}/4 pipelines done in "
        f"{round(elapsed/60, 1)} min\n\n"
        f"<a href='https://gni-myanmar.vercel.app'>Dashboard</a> | "
        f"<a href='https://gni-myanmar.vercel.app/news'>News</a> | "
        f"<a href='https://gni-myanmar.vercel.app/intel'>Intel</a>\n\n"
        f"#GNI #Myanmar #GlobalIntelligence"
    )

    return completed


def run():
    start    = datetime.now(timezone.utc)
    run_date = start.date()
    run_ts   = start.isoformat()

    log("=" * 60)
    log("GNI Myanmar Management Pipeline v2 (Parallel)")
    log(f"Started: {run_ts}")
    log("Conductor | Health Monitor | Parallel Dispatcher")
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

    log(f"  Alert found! Starting parallel conductor mode...")
    run_conductor(supa, signal_id, run_date, run_ts)
    return True


if __name__ == "__main__":
    sys.exit(0 if run() else 1)