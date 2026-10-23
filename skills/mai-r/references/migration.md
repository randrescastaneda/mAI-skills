# Legacy R and ellmer Boundaries

The PIP R article (dated 2026-06-09) uses Connect content OAuth, `httr::POST`,
and DEV Azure deployment chat completions with `api-version=2025-04-01-preview`.
Its response extraction is `choices[[1]]$message$content`. The supplied endpoint
migration guide resolves the target to root `/maifactory/openai/responses`.
Use `instructions` and `input`, put the model in JSON, and extract non-empty
`output_text` or text from `output[].content[].text`. Do not mix these contracts
or use the retired foundation root below `/conversationalai/maifactory`.

## Migration Checklist

1. Record the current auth integration, environment, full route, schema,
   version, model/deployment name, audit headers, and response shape.
2. Verify the target contract and authorization in current platform docs.
3. Keep credential acquisition separate from the request builder. Preserve
    Connect OAuth when that is the approved identity path.
4. Update payload fields and parsing together. Chat uses `messages`/`choices`;
   Responses uses `input`/structured `output`. Model token-limit parameters
   can differ. An endpoint change alone is not a migration.
5. Include the approved `x-team-name`, accurate `x-source-type`, fresh bearer,
   and any additional headers required by that access contract.
6. Test with mocked response fixtures first, then one approved public sample.
7. Handle long-session token refresh explicitly. The source's cached Shiny
   reactive has no refresh invalidation and is not a durable token provider.
8. Do not display raw HTTP error bodies in a Shiny notification. Show a safe
   message and retain only approved diagnostic fields.

## Desktop WAM Migration

Local Desktop acquisition now uses the approved current private SDK and WAM
setup under **Desktop Access** in current platform documentation. Use
`DesktopToken().get_token(env="DEV")`, `QA`, or `PROD`, not the retired
`_DESKTOP` suffix. No exact SDK release or supported OS list was supplied.
Do not add device-code, MSAL device flow, or InteractiveBrowserCredential
fallback. Application, Connect, and Databricks identity flows do not change.

The Desktop cutoff is **November 30, 2026**; the monthly limit is **50 million
tokens**. Contact `itsai_platform_admin@worldbankgroup.org` for extensions.
Tokens last about one hour. Reacquire before raw HTTP requests, or refresh and
rebuild clients that capture a string. A callable hook must be supported by the
installed client; the tested OpenAI Python hook does not establish ellmer support.

## ellmer

The supplied R source does not establish an ellmer client configuration or
compatibility with the new foundation API. Check the installed ellmer version
and official package documentation before configuring a custom OpenAI/Azure
client. A generic `chat_openai()` example from the public internet is not proof
that it uses the approved mAI route or refreshes a Bank bearer correctly.

Do not set `OPENAI_API_KEY` to the Connect `API_KEY`. The Connect key must stay
with the Connect client. If an approved ellmer integration supports a bearer
provider, use it; if not, rebuild/refresh the client according to the approved
contract, or keep the explicit httr2 wrapper. Never claim that a static API-key
argument refreshes itself. Review per-user chat state and tool permissions.

## Manual Keyring Storage, Only When Approved

Use a secure OS backend; do not select `backend_file` or a plaintext fallback.
Have the user run this in their own console, not through the coding agent:

```r
keyring::key_set(service = "worldbank-mai/DEV", username = "MAI_BEARER_TOKEN")
```

This prompts for a value without putting it in R source/history. It stores an
existing approved token; it does not issue a new token or extend its lifetime.
Never display `key_get()` output or return a token at the top level of an R
console. Remove obsolete entries with `key_delete()` under the same names.
Prefer a refresh-capable provider instead of manual bearer persistence.

Do not assume Python and R keyring service/account representations are fully
interoperable. Use the intended client's documented store and test without
revealing values.
