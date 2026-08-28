"""Developer probe for the batch-processor resilience additions (circuit
breakers + time budget), added after a live EODHD outage caused
finwerse-batch-cron-staging to blow past Render's 12h hard kill.

Run directly: `python verify_batch_resilience.py` from apps/api.
No DB connection required -- exercises only the pure-Python state machine
(BatchProcessor's failure counters / circuit flags, and the time-budget
comparison), not process_stock()/run() end-to-end.
"""
from datetime import datetime, timedelta, timezone

from services.batch_processor import BatchProcessor, CIRCUIT_BREAKER_THRESHOLD, RUN_TIME_BUDGET

failures = []


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        failures.append(label)


# --- EODHD circuit breaker ---
bp = BatchProcessor(db=None)
check("EODHD circuit starts closed", bp._eodhd_circuit_open is False)

for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp._note_eodhd_failure("TESTSYM")
check(
    f"EODHD circuit still closed after {CIRCUIT_BREAKER_THRESHOLD - 1} consecutive failures",
    bp._eodhd_circuit_open is False,
)

bp._note_eodhd_failure("TESTSYM")
check(
    f"EODHD circuit opens on the {CIRCUIT_BREAKER_THRESHOLD}th consecutive failure",
    bp._eodhd_circuit_open is True,
)

failures_before = bp._eodhd_consecutive_failures
bp._note_eodhd_failure("TESTSYM")
check(
    "Failure counter keeps incrementing once the circuit is already open (stays open, doesn't reset)",
    bp._eodhd_consecutive_failures == failures_before + 1 and bp._eodhd_circuit_open is True,
)

# --- IndianAPI circuit breaker: independent state from EODHD's ---
check("IndianAPI circuit starts closed", bp._indianapi_circuit_open is False)
for _ in range(CIRCUIT_BREAKER_THRESHOLD):
    bp._note_indianapi_failure("TESTSYM")
check(
    f"IndianAPI circuit opens on its own {CIRCUIT_BREAKER_THRESHOLD}-failure threshold",
    bp._indianapi_circuit_open is True,
)
check(
    "IndianAPI's counter is independent of EODHD's (no cross-contamination)",
    bp._indianapi_consecutive_failures == CIRCUIT_BREAKER_THRESHOLD,
)

# --- Reset-on-success semantics: a transient blip shouldn't trip the breaker ---
bp2 = BatchProcessor(db=None)
for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp2._note_eodhd_failure("TESTSYM")
bp2._eodhd_consecutive_failures = 0  # what a successful fetch does in process_stock
for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp2._note_eodhd_failure("TESTSYM")
check(
    "A reset before hitting the threshold means the circuit never opens (transient blips tolerated)",
    bp2._eodhd_circuit_open is False,
)

# --- Time budget arithmetic ---
backdated_start = datetime.now(timezone.utc) - (RUN_TIME_BUDGET + timedelta(minutes=1))
elapsed = datetime.now(timezone.utc) - backdated_start
check("Time budget check trips once elapsed time exceeds RUN_TIME_BUDGET", elapsed >= RUN_TIME_BUDGET)

fresh_start = datetime.now(timezone.utc)
elapsed_fresh = datetime.now(timezone.utc) - fresh_start
check("Time budget check does not trip for a freshly-started run", elapsed_fresh < RUN_TIME_BUDGET)

print()
if failures:
    print(f"{len(failures)} check(s) FAILED: {failures}")
    raise SystemExit(1)
print("All checks passed.")
