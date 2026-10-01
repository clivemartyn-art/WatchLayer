# Regstead M16.2 supervised pilot runbook

This runbook governs the first 3–5 real law-firm customers. Use production only after every M16.2 launch gate passes. Never copy staging fixtures into production, simulate customer consent or create a real charge without an actual consenting customer.

## Before each onboarding

- Confirm `https://app.regstead.co.uk/ready` is fully ready, worker heartbeat is current, backups are current, storage is healthy and there are no failed jobs/webhooks/emails.
- Confirm the operator is in production, the deployed release matches the approved SHA and Stripe is live mode with the Regstead product/Price only.
- Confirm current Terms, Privacy Policy, price and customer email wording are published and match the configured terms version.
- Record only operational pilot measures. Do not add invasive analytics.

## First-customer procedure

1. Receive the Free Scan request and verify the authorised contact.
2. Confirm manually that the firm is suitable for `lawwatch-england-wales`; uncertainty must not be converted into an established sector assignment.
3. Confirm authority to monitor the public website and the exact primary hostname.
4. Create the production organisation, primary site and pre-authorised portal contact. Check production remains isolated from every other organisation.
5. Run the one baseline scan and record runtime, retries and coverage limitations.
6. Human-review every customer-facing finding individually. Inspect evidence, context, uncertainty and serious findings. Do not bulk-approve.
7. Release the reviewed baseline only after all decisions are complete and wording is safe. Record artifact hash and review time.
8. Confirm provider acceptance of the baseline notification and confirm receipt with the intended customer where practical.
9. Have the customer use a fresh passwordless link; verify their portal shows only their organisation and released report.
10. Offer Regstead Monitor at £16.99/month for one primary website with the published cancellation and retention terms.
11. If the customer chooses to proceed, have them accept the current terms and complete the real Stripe-hosted subscription themselves. Do not enter payment details or manufacture a charge.
12. Verify signed webhook processing, exact Regstead product/Price, active paid entitlement and customer portal status.
13. Verify one next scheduled monitoring time and no duplicate baseline or monitoring job.
14. Observe the first genuine scheduled monitoring cycle, including its comparison baseline, runtime, retries and release version.
15. Human-review every monitoring finding individually and compare continuity evidence conservatively.
16. Release the second report, verify its immutable hash, provider notification and portal history/view/download.
17. Collect voluntary feedback on report clarity/usefulness, portal experience and support. Record no more personal data than necessary.

Cancellation is performed through the server-resolved Stripe Billing Portal. Confirm cancel-at-period-end retains service through the paid period; final cancellation stops future jobs and preserves released history under the retention policy. Never change local entitlement manually.

## Pilot measurements

For each firm maintain a private operator record with:

- baseline and monitoring runtime;
- human review time and release turnaround;
- total, approved, suppressed and annotated findings;
- customer-relevant and unclear/irrelevant findings;
- scan failures, retry reason and outcome;
- support time and issue category;
- voluntary report and portal feedback;
- conversion to Monitor;
- voluntary cancellation reason.

Report aggregates for the cohort. These figures are operational signals, not live accuracy, compliance or regulatory-certification claims. Do not record browsing behavior or marketing profiles.

## Stop conditions

Stop onboarding or release when readiness is degraded, provider environment is unclear, organisation isolation fails, a serious finding is ambiguous, artifact hash differs, published legal text is stale, notification delivery is unresolved, or a backup cannot be verified. Resolve the cause without deleting history or rewriting release/version records.
