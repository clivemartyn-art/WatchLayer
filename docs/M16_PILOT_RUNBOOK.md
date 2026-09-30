# Regstead 3–5 Customer Pilot Runbook

This procedure uses the private operator console. Keep the authenticated CLI available for recovery. Every report remains subject to individual human review.

## Daily start

1. Open `/admin` and confirm every readiness component is true and the worker heartbeat is current.
2. Inspect failed jobs, webhooks and emails. Retry only after identifying a transient or corrected cause.
3. Inspect reports awaiting review and overdue monitoring schedules.
4. Check storage/backup monitoring outside the application.

## Customer lifecycle

### 1. Free Scan lead and eligibility

- Verify the organisation name, authorised contact and primary public hostname manually.
- Establish whether the organisation is an England and Wales law firm for which LawWatch is an appropriate public-signal pack.
- On `/admin/onboard`, select the displayed LawWatch pack, record `ESTABLISHED` or `NOT_ESTABLISHED`, and explicitly confirm assignment.
- Do not use `NOT_ESTABLISHED` as an assertion of legal status. Resolve uncertainty before presenting sector findings to a customer.
- Confirm browser fallback policy and monitoring cadence.

Automated: URL normalization, public-network check, duplicate hostname rejection, baseline job identity, audit and onboarding notification.

Manual: identity, consent/contact authority, sector/pack fit, terms and any pilot approval.

### 2. Baseline and review

- Watch the baseline job through queued/running/awaiting-review.
- Open the report in `/admin/review/:reportId`.
- Treat the first-baseline banner as context: continuity rules do not yet have prior history.
- Inspect each source, evidence item, service context, uncertainty and previous observation.
- Record APPROVED, SUPPRESSED or ANNOTATED separately for every finding. Notes must explain the evidence decision and avoid legal conclusions.
- Never approve a cohort solely to clear the queue.
- When every decision is complete, inspect customer wording and type `RELEASE`.

Automated: raw evidence retention, append-only decisions, complete-review gate, unsafe legal wording rejection, concurrency check, immutable customer artifact/hash and notification identity.

Manual: evidence relevance, suppression/annotation, customer wording and release approval.

### 3. Invitation and subscription

- Create the pre-authorised customer PortalUser through the CLI until an operator-console invitation screen is justified by pilot evidence.
- Send the invitation and verify provider acceptance. Provider acceptance is not inbox proof.
- After approved terms acceptance, create Checkout through the existing CLI workflow. Stripe-hosted Checkout and verified webhooks remain authoritative.
- Confirm subscription state in `/admin/organisations/:id`. Never copy Stripe IDs into a browser form.

### 4. Recurring monitoring

- Confirm the next scheduled run on the dashboard.
- Verify each monitoring run has a comparison baseline and expected release/version.
- Review every monitoring report as above. Release only after evidence-specific decisions.
- Confirm the customer notification is accepted and the released report appears in customer history.

### 5. Cancellation and support

- Open the server-resolved Stripe Billing Portal from the organisation page. Do not change local subscription state manually.
- Confirm verified webhook state, paid-period entitlement, final cancellation and monitoring ineligibility.
- Historical released reports remain available while the customer identity remains authorised, subject to approved retention policy.
- For contact/access issues, disable the user and issue a fresh invitation after re-authorisation. Never disclose a magic link or session token.

## Failure and recovery

- **Failed scan:** inspect failure code and evidence. Retry only an eligible FAILED job after the cause is transient/corrected. Permanent robots or policy blocks are not bypassed.
- **Failed webhook:** compare with Stripe sandbox/production truth in the correct environment, then retry the original webhook ID. Never fabricate activation.
- **Failed email:** confirm provider/sender state and retry the original notification identity. Ambiguous provider acceptance requires reconciliation.
- **Worker interruption:** allow the lease to expire and recover through normal fencing. Do not edit job history.
- **Artifact mismatch:** stop delivery and investigate storage. Never regenerate a historical released report with current logic.
- **Restore:** stop services, use the packaged backup/restore process into a disposable destination, use the matching release and verify report hashes plus the next comparison. All sessions and links are revoked.
- **Readiness failure:** stop onboarding/release work until database, worker, engine, configuration and email checks recover.

## Weekly pilot review

Record scan duration, review turnaround, reviewed/approved/suppressed/annotated counts, delivery failures, job retries, schedule reliability and support events. These aggregates guide later work; they are not customer analytics or accuracy claims.
