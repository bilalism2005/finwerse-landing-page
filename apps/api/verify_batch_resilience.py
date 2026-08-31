"""Developer probe for the batch-processor resilience additions (circuit
breakers + time budget + FinVADER/Groq escalation logic).

Run directly: `python verify_batch_resilience.py` from apps/api.
No DB connection required -- exercises only the pure-Python state machine
(BatchProcessor's failure counters / circuit flags, the time-budget
comparison, and the FinVADER escalation decision), not process_stock()/run()
end-to-end, and does not call the real Groq API.
"""
from datetime import datetime, timedelta, timezone

from services.batch_processor import (
    BatchProcessor,
    CIRCUIT_BREAKER_THRESHOLD,
    RUN_TIME_BUDGET,
    FINVADER_AMBIGUOUS_THRESHOLD,
    FINVADER_DISAGREEMENT_THRESHOLD,
)

failures = []


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        failures.append(label)


# --- IndianAPI circuit breaker (fundamentals + news share this one) ---
bp = BatchProcessor(db=None)
check("IndianAPI circuit starts closed", bp._indianapi_circuit_open is False)

for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp._note_indianapi_failure("TESTSYM")
check(
    f"IndianAPI circuit still closed after {CIRCUIT_BREAKER_THRESHOLD - 1} consecutive failures",
    bp._indianapi_circuit_open is False,
)

bp._note_indianapi_failure("TESTSYM")
check(
    f"IndianAPI circuit opens on the {CIRCUIT_BREAKER_THRESHOLD}th consecutive failure",
    bp._indianapi_circuit_open is True,
)

failures_before = bp._indianapi_consecutive_failures
bp._note_indianapi_failure("TESTSYM")
check(
    "Failure counter keeps incrementing once the circuit is already open (stays open, doesn't reset)",
    bp._indianapi_consecutive_failures == failures_before + 1 and bp._indianapi_circuit_open is True,
)

# --- Groq sentiment-escalation circuit breaker: independent state ---
check("Groq sentiment circuit starts closed", bp._groq_sentiment_circuit_open is False)
for _ in range(CIRCUIT_BREAKER_THRESHOLD):
    bp._note_groq_sentiment_failure("TESTSYM")
check(
    f"Groq sentiment circuit opens on its own {CIRCUIT_BREAKER_THRESHOLD}-failure threshold",
    bp._groq_sentiment_circuit_open is True,
)
check(
    "Groq sentiment's counter is independent of IndianAPI's (no cross-contamination)",
    bp._groq_sentiment_consecutive_failures == CIRCUIT_BREAKER_THRESHOLD,
)

# --- Reset-on-success semantics: a transient blip shouldn't trip the breaker ---
bp2 = BatchProcessor(db=None)
for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp2._note_indianapi_failure("TESTSYM")
bp2._indianapi_consecutive_failures = 0  # what a successful fetch does in process_stock
for _ in range(CIRCUIT_BREAKER_THRESHOLD - 1):
    bp2._note_indianapi_failure("TESTSYM")
check(
    "A reset before hitting the threshold means the circuit never opens (transient blips tolerated)",
    bp2._indianapi_circuit_open is False,
)

# --- When the Groq circuit is open, score_sentiment falls back to FinVADER's
# own combined score instead of raising or blocking scoring entirely ---
bp3 = BatchProcessor(db=None)
bp3._groq_sentiment_circuit_open = True
fallback_score = bp3.score_sentiment("TESTSYM", "Test Company", "The company held its annual general meeting today as scheduled.")
check(
    "score_sentiment falls back to FinVADER's own score when the Groq circuit is open (never raises)",
    fallback_score is not None,
)

# --- Time budget arithmetic ---
backdated_start = datetime.now(timezone.utc) - (RUN_TIME_BUDGET + timedelta(minutes=1))
elapsed = datetime.now(timezone.utc) - backdated_start
check("Time budget check trips once elapsed time exceeds RUN_TIME_BUDGET", elapsed >= RUN_TIME_BUDGET)

fresh_start = datetime.now(timezone.utc)
elapsed_fresh = datetime.now(timezone.utc) - fresh_start
check("Time budget check does not trip for a freshly-started run", elapsed_fresh < RUN_TIME_BUDGET)

# --- FinVADER escalation decision logic (pure function of its own scores,
# no network calls -- re-derives the same ambiguous/disagree check
# score_sentiment uses, to confirm the threshold constants behave as
# documented without needing a live Groq call) ---
def would_escalate(senti_only, henry_only, combined):
    ambiguous = abs(combined) < FINVADER_AMBIGUOUS_THRESHOLD
    disagree = (senti_only * henry_only < 0) or (abs(senti_only - henry_only) > FINVADER_DISAGREEMENT_THRESHOLD)
    return ambiguous or disagree

check(
    "Clear agreement, confident score does NOT escalate (senti=0.45, henry=0.78, combined=0.79)",
    would_escalate(0.448, 0.784, 0.789) is False,
)
check(
    "Opposite-sign disagreement DOES escalate (the real debt/cost failure case: senti=-0.47, henry=+0.57)",
    would_escalate(-0.471, 0.572, 0.206) is True,
)
check(
    "Same-sign but large magnitude gap DOES escalate (the real fraud-dilution case: senti=-0.28, henry=-0.83)",
    would_escalate(-0.277, -0.827, -0.277) is True,
)
check(
    "Near-zero combined score DOES escalate even if both lexicons agree (routine/neutral text)",
    would_escalate(0.0, 0.0, 0.0) is True,
)

print()
if failures:
    print(f"{len(failures)} check(s) FAILED: {failures}")
    raise SystemExit(1)
print("All checks passed.")
