---
name: mai-troubleshooting
description: >-
  Diagnose World Bank mAI Factory setup, authentication, network, API, and quota
  failures. Use for 401, 403, 404, 422, 429, 500, 504, expired tokens, wrong
  environments, health checks, Mac or IFC access, Databricks provisioning, and
  sanitized platform support reports. Includes independent access setup and
  local token diagnostics without exposing claims or secrets.
---

# mAI Troubleshooting

Use this skill to isolate a failure without exposing credentials or weakening
access controls. It has no dependency on another skill.

## First Actions

1. If credentials, a SAS URL, or full headers were exposed, stop sharing them.
   Follow the approved rotation/revocation and incident process. Deleting a log
   does not invalidate an exposed credential.
2. Confirm onboarding or content-integration approval; Desktop, Application,
   Databricks, or Posit Connect Access; environment; team; actual workload;
   runtime; and time of failure. Never request secret values.
3. Read [Access and Verification](references/access-and-verification.md) for
   installation, scope coupling, providers, headers, onboarding, and search.
4. Separate network reachability, token acquisition, API authorization, request
   validation, model behavior, and service capacity. Change one variable at a time.
5. Verify current intranet schemas before generating API tests, changing routes,
   or asserting endpoint behavior. If unavailable, ask for a non-secret
   authoritative excerpt and use offline diagnostics meanwhile.

Do not ask for an unredacted trace, a token, all claims, all environment
variables, full request/response bodies, or `curl -v` output with credentials.

## Minimum Safe Evidence

Collect UTC timestamp/time zone, environment, access type, runtime and package
versions, operation name, sanitized path without query values, HTTP status,
latency, attempt count, and the documented request/correlation ID. Record whether
failure occurred before an HTTP response. Do not record SAS paths or query data.

Use an allowlist for diagnostic fields. Record header presence as booleans,
never full headers. Summarize a redacted error category after local review;
exceptions and server errors can echo credentials or payloads. Do not assume a
regular-expression redactor catches every secret.

## Discovery, Not Invocation

These hints are NOT an invocation specification. Verify method, complete URL,
required auth, schema, and environment through current docs before tests.

| Component | Discovery hint | What it can establish |
| --- | --- | --- |
| Health | `/conversationalai/platform/health/` (reference method: GET) | Gateway/service reachability for that route only |
| Foundation base | `/maifactory` | Route family, not model authorization |
| Platform base | `/conversationalai/platform` | Route family, not a schema |
| Model catalog | Current mAI Factory model site | Availability information to check per environment |

Reference hosts are `https://azapimdev.worldbank.org`,
`https://azapimqa.worldbank.org`, and `https://azapim.worldbank.org`. Match the
selected host to the environment scope in the access reference.

A documented healthy response does **not** prove that the user is onboarded,
that the token is valid, that app grants/subscriptions exist, or that a model is
enabled. A failed health route also does not prove that every model backend is
down. Distinguish DNS/TLS/connectivity failure from an HTTP 401/403 response and
from a backend inference failure.

## Status Guide

| Status | Main checks | Safe action |
| --- | --- | --- |
| 401 | Scope/host mismatch; expired or missing bearer; wrong tenant; credential expiry | Correct configuration; obtain a fresh provider token; retry once only after correction |
| 403 | Onboarding; app grant; subscription/product access; approved ACN/VNET path; model policy | Confirm permissions and network provisioning with the responsible team |
| 404 | Current route; exact deployment ID; selected environment; SDK-appended path | Verify contract and deployment before changing a path or model |
| 422 | Required fields/types; protocol family; model-supported parameters; multipart vs JSON | Validate locally against the current gateway schema; do not resend unchanged |
| 429 | Temporary RPM/TPM throttling; upstream quota; exhausted budget; reset evidence | Bound concurrency; use documented backoff/reset, or request quota correction |
| 500 | Gateway/backend failure; unsupported operation; provider/parser mismatch | Collect sanitized request ID/time; bounded retry only if confirmed transient |
| 504 | Gateway/upstream deadline; workload size; client/server timeout mismatch | Check remote completion and duplicate risk before any retry |

Status codes alone do not establish the cause. Inspect a small, sanitized error
category locally and compare it with the verified platform contract.

## 401: Authentication

1. Check presence, not values, of required configuration. Desktop uses its
   approved SDK environment, not the OAuth scope string as `env`.
2. Check that host and scope come from the same environment row. Avoid changing
   only a base URL during promotion. App subscription/product access can also
   be environment-specific.
3. Use a fresh bearer from the provider at request time. For SDKs, confirm a
   refresh-capable credential hook, not a token captured at client startup.
4. Check local clock accuracy and credential expiry through approved tooling.
   Confirm the app's tenant and grant without exposing app secrets.
5. Inspect only local expiry/audience comparison flags when needed. A decoded
   token is untrusted diagnostic data, not verified authentication.

### Local Token Flags

Use this helper only in a trusted local process. Supply the current approved
resource audiences from authoritative configuration. The requested OAuth scope
ends in `/.default`; do not assume that the token's `aud` equals that full scope.
Audience format can depend on resource/token version.

```python
import base64
import json
import math
import time

def local_token_flags(
    token: str, approved_audiences: set[str], *, now: float | None = None
) -> dict[str, bool | None]:
    """Decode locally for comparison only; do not verify or authorize a token."""
    try:
        parts = token.split(".")
        if len(parts) != 3 or len(parts[1]) > 32768:
            raise ValueError
        encoded = parts[1] + "=" * (-len(parts[1]) % 4)
        claims = json.loads(
            base64.b64decode(encoded, altchars=b"-_", validate=True)
        )
        if not isinstance(claims, dict):
            raise ValueError
    except (ValueError, UnicodeError, RecursionError):
        raise ValueError("Cannot decode token locally for diagnostics") from None

    audience = claims.get("aud")
    audiences = [audience] if isinstance(audience, str) else audience
    audience_matches = isinstance(audiences, list) and any(
        isinstance(value, str) and value in approved_audiences
        for value in audiences
    )
    expiry = claims.get("exp")
    expiry_known = type(expiry) in (int, float) and (
        not isinstance(expiry, float) or math.isfinite(expiry)
    )
    current_time = time.time() if now is None else now
    return {
        "audience_matches": audience_matches,
        "expiry_available": expiry_known,
        "expired": expiry <= current_time if expiry_known else None,
        "expires_within_60s": expiry <= current_time + 60 if expiry_known else None,
    }
```

Do not print the input, decoded claims, header, signature, or claim values. If
shared, use only the boolean flags. The helper does **not** validate signature,
issuer, tenant, revocation, permissions, or server acceptance. Never use it in an
authorization decision, and never upload tokens to an online decoder.

## 403: Permissions and Network

- Confirm user/app onboarding and the specific product/model grant. A valid
  token or a successful browser login does not grant API access by itself.
- For Application Access, check the approved app registration, ACN, VNET/peering,
  firewall path, and `Ocp-Apim-Subscription-Key` presence. Do not use someone
  else's key or token to test a permission failure.
- Desktop: check the approved WB VPN/network configuration. The PIP guide
  requires US East outside DC; inside DC on `bluemarlin`, a connected
  GlobalProtect session is sufficient. Confirm current network policy.
- Mac: the source guide notes additional approved exceptions. Confirm the
  current Mac process with platform support. Do not disable certificate checks,
  MFA, endpoint protection, or VPN controls as a workaround.
- IFC: use the IFC-specific onboarding/risk-assessment process. Obtain the right
  form from support; do not send IFC users through the standard form instead.
- Databricks: check Data Lab provisioning, exact workspace/cluster, network
  policy, and assigned credential flow with the Data Science team. Do not inject
  a personal desktop token or invent a managed identity helper.
- Posit Connect R/Shiny: check the content's approved OAuth integration, audience,
  and access. Desktop onboarding is not required for this documented content
  flow. Its Connect `API_KEY` is not an mAI/APIM subscription key.

For DNS, TLS, proxy, or connect errors, use approved network diagnostics with
hostnames only and no bearer. Keep TLS verification enabled. Do not edit hosts
files, open public routes, use an unapproved proxy, or bypass private endpoints.

## 404 and 422: Route or Schema

The guides conflict: legacy foundation routes include
`/conversationalai/maifactory`, while the newer guide lists root `/maifactory`.
Gemini Interactions and native Generate Content are different contracts. Bedrock
Converse and Anthropic native bodies/response parsers are also different.

Verify the complete SDK-generated URL, without logging headers or query values.
Check doubled prefixes, missing SDK suffixes, trailing slash redirects, API
versions, exact model IDs, and per-environment deployments. Do not probe guessed
routes or fall back to a deprecated route without current documentation.

For 422, compare only field names/types against current docs. Confirm output
token parameter names, native content blocks, tool-result envelopes, and upload
content type. TTS multipart needs a client-generated boundary, not a JSON header.
Fix the request before another attempt.

## 429: Throttling or Quota

Use the documented error category, reset information, safe quota counters, and
platform status to distinguish short-term rate limits from exhausted budget or
upstream quota. The legacy statement that Gemini is never gateway-throttled is
not a current guarantee. The word `tokens` alone does not prove budget exhaustion.

For temporary throttling, reduce concurrent requests and token volume; honor a
documented `Retry-After` and use exponential backoff with jitter. Set both maximum
attempts and an overall elapsed-time budget. Do not retry earlier than a longer
server delay; stop if that delay exceeds the budget.

For exhausted quota, stop and use the approved quota/support process. Do not
rotate identities, switch environments, change `x-source-type`, or use public
providers to evade limits. Repeated unchanged retries consume resources.

## 500 and 504: Service or Timeout

- Set bounded connect, read, and overall deadlines based on the verified service
  contract. A longer client timeout cannot extend a gateway/server deadline.
- Reduce request size or output budget only within the model's verified schema.
  Use documented batch/asynchronous processing when the workload permits it.
- `x-source-type` reflects the actual workload. Do not change interactive work
  to `job` merely to seek longer timeouts, priority, or quota.
- After a timeout, check whether a batch, upload, synthesis, or tool action
  already succeeded. Use saved IDs and documented reconciliation before retrying.
- Do not replay a partially consumed stream or side effect blindly. Retain
  partial output as incomplete, not as a completed successful response.
- Use one retry layer, not stacked SDK/LangChain/application retries. Retry only
  confirmed transient errors within bounded attempts/time. Escalate repeated
  server failures with a sanitized request ID and timestamp.

## Support Report

Send this through an approved channel to
`itsai_platform_admin@worldbankgroup.org`. For Databricks provisioning include
`SN-ITSAI-Datascience-Team-Admins@worldbankgroup.org` as appropriate.

```text
Subject: mAI Factory <environment> <operation> <status/category>
UTC time and time zone:
Access type and actual workload type:
Runtime and package versions:
Environment and operation (path without query values):
Approved team name:
Onboarding/app grant confirmed (yes/no/unknown):
HTTP status or pre-HTTP failure category:
Documented request/correlation ID:
Latency, attempts, and last known remote operation ID if applicable:
Health result (reachability only; not proof of authorization):
Schema source title/date or verification gap:
Local token flags only (no token or claim values):
Changes and safe checks already performed:
Expected behavior and sanitized actual behavior:
```

Do not attach secrets, full headers, SAS URLs, payloads, raw claims, unrestricted
traces, or source documents. Review every field for sensitivity. Platform staff
can request approved diagnostics through the correct process.

## Sources

- Reference data: `docs/mai-factory-builder.md` and
  `docs/mai-factory-builder.agent.md`. Legacy examples are not current contracts.
- Access facts from the PIP guidelines: `mAI_factory_API_setup_prerequisities.qmd`,
  `mAI_factory_setup_access_request.qmd`, `mAI_factory_environment_setup.qmd`,
  and `mAI_integration.qmd`. They do not verify current API contracts.
- [Current platform documentation](https://ai.worldbank.org/platform/documentation)
- [Current models](https://ai.worldbankgroup.org/maifactory/)
- Platform support: `itsai_platform_admin@worldbankgroup.org`
