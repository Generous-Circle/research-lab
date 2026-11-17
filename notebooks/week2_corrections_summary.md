# Week 2 Audit — Corrections Summary

*Prepared for: Sharlet Maithya*  
*Date: April 2026*  
*Companion notebook: `week2_pipeline_completeness_corrections.ipynb`*

---

## Correction 1: Silent Recording False Positive Rate

### Original statement
> "Our AI is 100% accurate — it has zero false positives on silent recordings."

### What actually happened
The original query measured **current state only**. Because the platform's recovery system had already fixed the false positives before the query ran, the current count showed zero — which looked like perfect accuracy.

The correct methodology tracks the `fallback_transcription_attempted_at` timestamp, which marks every answer that went through Gemini-based verification:

| Category | Count |
|----------|-------|
| Confirmed truly silent (Gemini agreed) | 334 |
| **Recovered false positives** (Gemini reclassified) | **234** |
| Currently unresolved false positives | **0** |

**Historical false positive rate: 41%** — meaning 234 out of 568 answers ever marked silent were wrong.

### Corrected statement
> "The platform identified and recovered **234 false-positive silent recordings** (41% of all answers ever flagged as silent). After Gemini fallback verification, zero unresolved false positives remain today. Detection accuracy improved significantly after a fix deployed in February 2026."

### Why this matters
The original framing implied the silence detection was always accurate. The corrected framing shows that:
1. The problem was real and significant (~150 affected candidates)
2. The engineering team built a recovery system that fully resolved it
3. The system is now working correctly — but that's the *result* of the fix, not evidence that there was never a problem

---

## Correction 2: Email 'Failure' Rate

### Original statement
> "Our email invites are failing 84% of the time."

### What actually happened
In Sendgrid's status model, **`sent` is not a failure** — it means Sendgrid accepted the email and delivered it to the recipient's mail server. Many mail servers don't send delivery receipts back, so `sent` is a normal successful final state.

**Actual deliverability breakdown (all email types, n=682):**

| Status | Count | % | What it means |
|--------|-------|---|---------------|
| sent | 492 | 72.1% | Delivered — no receipt sent back (normal) |
| delivered | 180 | 26.4% | Delivered — receipt confirmed |
| bounced | 4 | 0.6% | **True failure** — address doesn't exist |
| dropped | 4 | 0.6% | **True failure** — spam/unsubscribe list |
| blocked | 2 | 0.3% | **True failure** — blocked by recipient server |

**True deliverability failure rate: <2%** — our email infrastructure is healthy.

### What the 84% actually captured
The 84% figure was measuring the **audition completion rate** of candidates who received invite emails — not email delivery. Of 164 candidates who received an `audition_invite`:

| Status | Count | % |
|--------|-------|---|
| invited (never started) | 98 | 59.8% |
| scored (completed) | 39 | 23.8% |
| expired | 25 | 15.2% |
| in_progress | 2 | 1.2% |

**76% of invited candidates did not complete the audition.** This is an engagement gap, not a delivery problem.

### Corrected statement
> "Email deliverability is healthy (< 2% hard failure rate across 682 emails). The real challenge is post-delivery engagement: only 24% of candidates who receive an audition invite complete the audition. 60% never start, and 15% expire before doing so. This is an engagement problem — the fix belongs in email copy, reminder timing, or audition UX, not email infrastructure."

### Why this distinction matters for prioritization
- If it were a **delivery problem**: fix Sendgrid config, check domain authentication (SPF/DKIM)
- Since it's an **engagement problem**: test email subject lines, add reminder sequences, reduce audition friction, improve the invite landing page

These require completely different teams and different solutions.

---

*See `week2_pipeline_completeness_corrections.ipynb` for reproducible queries and charts.*
