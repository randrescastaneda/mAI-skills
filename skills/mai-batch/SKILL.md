---
name: mai-batch
description: >-
  Prepare, validate, submit, and monitor World Bank mAI Factory asynchronous
  batch workloads. Use for JSONL files, unique custom_id values, batch endpoint
  mismatches, bulk inference, bounded polling, partial results, error files,
  retention, or safe retry planning. Includes independent access setup and an
  offline Python JSONL validator.
---

# mAI Batch

Use batch processing for independent bulk requests when latency permits it.
This skill has no dependency on another skill. The bundled validator works
offline and does not import a provider SDK or obtain credentials.

## Start Here

1. Confirm the correct onboarding or content-integration approval before live
   calls. Establish Desktop, Application, Databricks, or Posit Connect Access;
   environment; team name; workload; approved data; model; and expected job size.
2. Read [Access and Verification](references/access-and-verification.md) for
   Desktop, Application, and Databricks setup, keys, scopes, and intranet search.
3. Verify the current mAI batch contract, not just the upstream OpenAI contract.
   Record the source title/date, environment, SDK base, supported endpoint,
   upload route, request schema, limits, status states, and retention controls.
4. If the schema is unavailable, prepare and validate files offline. Ask for a
   non-secret authoritative excerpt. Do not invent a runnable upload or starter.
5. Start with a small approved batch and reconcile every input before scaling.

## Endpoint Discovery

This table is a discovery reference, NOT an invocation specification. Paths are
host-relative and must not be concatenated with another copy of their prefix.

| Source hint | Path | Required verification |
| --- | --- | --- |
| Newer guide, batch base | `/maifactory/openai` | Current SDK base, files and batches routes |
| Legacy guide | `/conversationalai/v2/openai/v1/batches` | Whether this historical route still exists |
| Possible per-record target | `/v1/responses` | Whether this batch service accepts Responses |
| Possible per-record target | `/v1/chat/completions` | Whether this batch service accepts Chat Completions |

The newer foundation bases are
`https://azapimdev.worldbank.org/maifactory`,
`https://azapimqa.worldbank.org/maifactory`, and
`https://azapim.worldbank.org/maifactory`. Select the matching scope from the
access reference. Do not combine the newer base with a legacy files/batches
suffix or assume what an SDK appends.

## JSONL Contract

After current docs confirm support, choose **one canonical target string** for
the file and job: `/v1/responses` or `/v1/chat/completions`.

**Every JSONL record's `url` must equal the batch creation request's `endpoint`
exactly.** `/chat/completions`, `/v1/chat/completions`, and `/v1/responses` are not
interchangeable. The legacy guide's Responses file plus Chat Completions batch
creation is inconsistent; do not copy that combination.

- Each physical line is one UTF-8 JSON object, without a surrounding array or
  Markdown fences. Use no blank lines, byte-order mark, duplicate object keys,
  non-finite numeric values, or multiline JSON records.
- Each record has a unique, nonblank string `custom_id`, `method: "POST"`, the
  selected `url`, and an object `body` with the same exact approved `model`.
- All records in a batch use one deployment. Keep IDs stable and non-sensitive;
  do not use raw names, email addresses, or confidential text as IDs.
- Use the verified Responses body for `/v1/responses`; use the verified Chat
  Completions body for `/v1/chat/completions`. Do not rename only the URL.
- Verify current size, count, token, body-feature, and per-request limits. Do
  not assume tools, streaming, stateful references, or all synchronous features
  are supported in batch.

This is a structural fixture, NOT a verified sendable request. Its deployment
placeholder must be replaced only after model and request-schema verification:

```jsonl
{"custom_id":"task-001","method":"POST","url":"/v1/responses","body":{"model":"VERIFIED_BATCH_DEPLOYMENT","input":"Public test sentence."}}
{"custom_id":"task-002","method":"POST","url":"/v1/responses","body":{"model":"VERIFIED_BATCH_DEPLOYMENT","input":"Another public test sentence."}}
```

## Offline Validation

Use the bundled [JSONL validator](scripts/validate_jsonl.py) with Python 3.10 or
later. It has no third-party dependencies and makes no network calls.

```bash
python /path/to/installed/mai-batch/scripts/validate_jsonl.py input.jsonl \
  --endpoint /v1/responses --model VERIFIED_BATCH_DEPLOYMENT
```

Replace the script path with the installed skill location. The endpoint and
model are explicit structural expectations, not claims of server support.
The command returns 0 for structural success and 2 for a validation error.
Diagnostics contain static reasons and line numbers, not records or IDs.

For offline tests, the public Python entry point is
`validate_jsonl(path, *, endpoint, model) -> int` (request count). It raises
`ValidationError`, a `ValueError` subclass, for invalid structure or unreadable
UTF-8 input. It rejects empty files, blank lines, invalid JSON, duplicate keys,
NaN/Infinity, wrong methods/targets/models, and duplicate or blank custom IDs.

It does **not** validate provider body schemas, model availability, token counts,
data policy, current server limits, access, or quota. Passing offline validation
does not permit submission without the current-schema and onboarding checks.

## Submission Lifecycle

1. Save a manifest in approved storage: environment, verified endpoint/model,
   schema source/date, input digest, count, non-sensitive IDs, and workflow state.
   Do not store tokens, subscription keys, SAS URLs, or complete payloads in logs.
2. Validate the input offline and apply current service limits. Estimate cost
   using current platform pricing; do not promise the legacy fixed discount.
3. Generate the upload only from the verified schema. Confirm file purpose,
   upload content type, processing states, and any required retention parameters.
4. Save the returned input file ID before continuing. If processing must be
   polled, use the bounded policy below. Stop on documented file errors.
5. Create the batch using the saved file ID and the exact selected endpoint.
   Verify the accepted completion window; do not hardcode the legacy `24h`.
6. Save the returned batch ID immediately. Use the same environment and identity
   for monitoring and downloads. Never use a new environment to recover an ID.
7. Monitor through documented nonterminal states. Retrieve available output and
   error files at the documented terminal state, then reconcile all inputs.

Use fresh provider credentials for each request. `x-source-type` must reflect
the actual workflow; a scheduled batch worker uses `job`. Do not change a
header to obtain different quota or priority. Include `x-team-name` and, for
Application Access, `Ocp-Apim-Subscription-Key` on all required operations.

## Bounded Polling

- Set a monotonic overall deadline and a maximum attempt count before polling.
  Use intervals of **at least 60 seconds** for both file and batch polling, or
  a longer current platform requirement. Respect a longer `Retry-After`.
- The legacy job states include `validating`, `in_progress`, `finalizing`, and
  terminal `completed`, `failed`, `expired`, `cancelled`. Verify the current
  complete state list, including cancellation transitions. Unknown states need
  investigation, not an infinite loop.
- On the local deadline, persist the last known state and IDs and stop polling.
  A local timeout does not mean that the remote job stopped or was cancelled.
- Resume monitoring by saved ID. Cancel only through a documented operation
  when authorized; confirm its eventual state and inspect partial results.
- Polling is not resubmission. Do not recreate uploads or jobs to check progress.

## Outputs and Recovery

Outputs can be out of order. Match by `custom_id`, never by line position.
Parse the verified result envelope and inspect each record's error, response
status, completion state, and body before accepting it as success.

1. Retrieve both output and error files when available. Do not assume that
   `completed` means every request succeeded or that a failed/expired/cancelled
   batch has no useful partial results.
2. Reconcile expected IDs with successful, failed, missing, duplicate, and unknown
   output IDs. Treat malformed or conflicting records as review items.
3. Keep outputs and errors in approved storage. Report aggregate counts and
   sanitized reasons, not source text, generated content, or complete error bodies.
4. Save verified successes once. For recoverable failures, create a new manifest
   containing only the eligible failed or missing requests, with lineage to the
   original batch. Do not resubmit accepted successes.
5. Investigate ambiguous submission timeouts before retrying. Use saved IDs and
   documented idempotency/reconciliation if available; do not invent a header.
   A blind upload or batch-create retry can create duplicate costs and jobs.

Retry only confirmed transient failures with bounded backoff, jitter, and an
overall deadline. Correct 401/403/404/422 before another attempt. For 429, use
the documented quota/reset evidence to distinguish temporary throttling from
exhausted budget; do not retry indefinitely or assume the provider's origin.

## Retention

Verify the latest `expires_after` support, placement, allowed anchors, units,
minimum/maximum values, input/output coverage, and deletion behavior before
generating upload code. Do not copy the legacy 14-day value or its claimed
increase in file limits as a current guarantee.

Set retention to approved policy and processing needs. Track retrieval deadlines
and deletion confirmation for input, output, and error artifacts. An expired
download credential is not evidence that a stored file was deleted. Keep local
copies only in approved storage and remove them under the same policy.

## Delivery Checklist

Return the verified schema source or explicit verification gap, access and
environment assumptions, offline validation result, expected cost/limits source,
manifest design, bounded monitoring policy, and reconciliation/retention plan.
Add tests for endpoint mismatch, model mismatch, duplicate IDs, malformed JSON,
partial output, non-success statuses, expired jobs, polling deadlines, and
ambiguous submission without making live calls by default.

Never log tokens, full headers, SAS URLs, or payloads. Keep TLS verification,
approved VPN/network routes, permissions, and data controls enabled.

## Sources

- Historical sources (not bundled): `mai-factory-builder.md` and
  `mai-factory-builder.agent.md`. The legacy lifecycle has an endpoint mismatch.
- Access facts from the PIP guidelines: `mAI_factory_API_setup_prerequisities.qmd`,
  `mAI_factory_setup_access_request.qmd`, `mAI_factory_environment_setup.qmd`,
  and `mAI_integration.qmd`. They do not verify current API contracts.
- [Current platform documentation](https://ai.worldbank.org/platform/documentation)
- [Current models](https://ai.worldbankgroup.org/maifactory/)
- Platform support: `itsai_platform_admin@worldbankgroup.org`
