---
name: mai-r
description: Connect R and Shiny to World Bank mAI Factory. Use for WAM or device-code migration, Posit Connect content OAuth, connectapi, API_KEY/OAUTH_INTEGRATION_GUID, R Desktop authentication, httr2 requests, ellmer migration, secure keyring storage, or token expiry in Shiny.
---

# R and Shiny

Select authentication separately from the model API. The PIP source's R
example is a Posit Connect content OAuth workflow with a legacy Azure chat
request. It is not a Desktop API-key workflow or a current Responses contract.

## Choose Access

| Context | Action |
| --- | --- |
| Shiny/content on `datanalytics-int.worldbank.org` | Use the approved Connect content OAuth integration below |
| R on a local desktop | Confirm Desktop onboarding; use approved Python `DesktopToken` through `reticulate` if permitted |
| Unattended backend outside Connect | Obtain Application Access approval; do not use a personal Desktop token; use the approved application credential provider |
| Databricks R notebook | Use Data Lab provisioning and workspace instructions, not this local setup |

IFC must contact `itsai_platform_admin@worldbankgroup.org` for its specific
access process. Do not require the Desktop onboarding form for the documented
Connect OAuth path. For Desktop use the
[standard request](https://worldbankgroup.service-now.com/wbg/en/itsai-platform-on-boarding-request?id=wbg_sc_catalog&sys_id=7715cc6d93ac96d0a2f6fd647aba1042),
with **Access to mAI Factory** and **Desktop**, and wait for approval.

## Posit Connect Credentials

1. Confirm the content runs on the approved internal Connect server and has
   the approved mAI OAuth integration. Ask the Connect/platform owner if missing.
2. Set `API_KEY` in protected Connect content environment settings. This is
   the **Connect API key**, not a public OpenAI key or APIM subscription key.
   Create/manage it through the approved Connect account process. Do not copy
   a teammate's key or automate credential extraction.
3. Add/select the approved mAI OAuth integration on Connect. Obtain its
   generated GUID from that integration and set `OAUTH_INTEGRATION_GUID` in
   content settings. The GUID identifies the integration; it is not a token.
4. Set non-secret `MAI_ACCESS_TYPE=posit-connect`, `MAI_ENV=DEV`,
   `MAI_TEAM_NAME` to the approved team name, and `MAI_SOURCE_TYPE=interactive`
   for user-driven Shiny work (`job` for approved scheduled content).
5. Use `connectapi::get_oauth_content_credentials(connect=client,
   audience=guid)` and read `credentials$access_token` in memory. Do not save
   or display the returned object.
6. Confirm the integration grants the target environment/API. The old guide
   does not prove entitlement to new foundation routes.

The [R starter](assets/mai_client.R) validates both required Connect settings
and acquires credentials through a provider function on each request. Do not
cache a bare token forever in `reactive()` or a global variable. Connect still
owns issuance/refresh; confirm its current long-session behavior and permissions.
Keep user/session state separate and do not share chats between Shiny users.

## Install and Check Offline

Install through the project's approved package source:

```r
install.packages(c("connectapi", "httr2"))
```

Inspect existing project files before copying the starter into the user's
project. Do not store settings in the installed skill directory.

```r
source("mai_client.R")
Sys.setenv(MAI_ACCESS_TYPE = "posit-connect", MAI_ENV = "DEV",
           MAI_TEAM_NAME = "your-approved-team-name", MAI_SOURCE_TYPE = "interactive")
config <- mai_config()
# Configuration only; no credential-store read, login, or network request.
```

The starter does not auto-load `.env` files. For Connect, enter actual secrets
only in the approved content settings, not in `Sys.setenv()` source code.
For local work, prefer an approved OS credential store. Never commit
`.Renviron`, `.env`, `.Rhistory`, tokens, or serialized chat/client objects.
An ignored file is not automatically excluded from an agent's context.

## Approved Live Checks

After the correct access approval:

```r
provider <- mai_token_provider(config)
mai_health(config, provider)
```

A healthy result proves reachability, not model permissions. The starter
uses TLS verification, a 30-second timeout, no redirects, no automatic retry,
fresh token acquisition, and sanitized errors. Do not print request objects.

Before configuring a model call, verify the environment-specific **full
Responses URL**, request schema, deployment, and response shape in current
[mAI documentation](https://ai.worldbank.org/platform/documentation).
Use intranet search, if available, filtered to
`siteurl=https://worldbankgroup.sharepoint.com/sites/aiwb` and
`contenttype=OneCMS_File`, including `mai-factory-documentation.docx`.
If current documentation is unavailable, request a non-secret excerpt or
contact support. Do not change only the URL of the legacy chat example.

The migration guide resolves the full DEV Responses URL to
`https://azapimdev.worldbank.org/maifactory/openai/responses`. Use the matching
QA or PROD host only with approval. The model goes in JSON, not the URL.
Health stays under `/conversationalai/platform/health/`; do not strip that
prefix globally. Preserve Connect content OAuth and its permissions.

After verification, set `MAI_RESPONSES_URL` and `MAI_MODEL` as non-secret
content configuration, then test with public sample text:

```r
config <- mai_config()
text <- mai_ask(config, provider, "Explain the World Bank mission in one sentence.")
```

The starter accepts only the canonical root Responses route on the matched
Bank host and requires an explicit URL. It sends a bounded Responses request
and reads non-empty `output_text` or structured `output` text blocks. It does
not use `choices[[1]]` for Responses. No live endpoint access was verified.
Omit GPT-5 `temperature`; use output-token and reasoning controls only when
supported by the selected model. Preserve existing prompts, models, and logic.

## Local R Desktop

The local route requires Desktop approval, the approved current private SDK,
approved network/VPN, and Web Access Management (WAM) setup from **Desktop
Access** in current platform documentation. The material does not state an exact SDK release,
supported OS list, or OS-specific WAM settings. Older Python 3.12 guidance is
not proof of current WAM compatibility. Follow the approved private-index
instructions and bind `reticulate` to that environment before Python initializes.

For an existing uv environment, upgrade through the approved private index
with `uv lock --upgrade-package itsai-platform` and `uv sync` before starting
R/Python. Confirm the release against current Desktop Access requirements;
repeating `uv add` can retain an old lock.

Then configure the R Desktop provider:

```r
install.packages("reticulate")
reticulate::use_virtualenv("/path/to/approved/.venv", required = TRUE)
Sys.setenv(MAI_ACCESS_TYPE = "desktop", MAI_ENV = "DEV",
           MAI_TEAM_NAME = "your-approved-team-name", MAI_SOURCE_TYPE = "interactive")
config <- mai_config()
provider <- mai_token_provider(config)
```

The provider uses `DesktopToken().get_token(env="DEV")`, `QA`, or `PROD`, not
retired names with `_DESKTOP` suffixes or an SDK `token_provider` method. Do
not add device-code, MSAL device flow, or `InteractiveBrowserCredential`
fallback. The final migration cutoff is **November 30, 2026**. Desktop Access
has a **50 million token monthly limit**; ask
`itsai_platform_admin@worldbankgroup.org` for extensions.

Tokens last about one hour. The R HTTP wrapper obtains a provider result for
each request. A client that captures a string must be rebuilt after refresh;
do not assume that a static bearer or a cached reactive refreshes itself.
No persistent public provider API key is needed. Do not save the Desktop
bearer in `.Renviron`. If a documented legacy workflow needs manual storage,
use an approved encrypted OS `keyring` backend and hidden `key_set()` prompt
in the user's own R console. Do not let the agent enter or retrieve the value.
Mark it temporary and refresh it through the approved flow, not by reusing an
expired keyring entry. See [legacy and ellmer boundaries](references/migration.md).

## Completion

Confirm access path, protected settings, offline validation, network/auth
result, and one verified small call. Independently review AI output. Report
only status/request ID/time, not bearer tokens, Connect keys, full errors,
source data, or generated content. Support: `itsai_platform_admin@worldbankgroup.org`.

Sources: PIP `mAI_integration.qmd`, `mAI_factory_setup_access_request.qmd`,
`mAI_factory_environment_setup.qmd`, historical builder guides, and the
2026-10-23 Desktop migration notice and endpoint/auth migration guide. These
source inputs are not distributed. Never copy credentials, personal data,
source cells, or outputs from the supplied notebook export into project files.
