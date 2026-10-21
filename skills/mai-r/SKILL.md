---
name: mai-r
description: Connect R and Shiny to World Bank mAI Factory. Use for Posit Connect content OAuth, connectapi, API_KEY/OAUTH_INTEGRATION_GUID, R Desktop authentication, httr2 requests, ellmer migration, secure keyring storage, or token expiry in Shiny.
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

After verification, set `MAI_RESPONSES_URL` and `MAI_MODEL` as non-secret
content configuration, then test with public sample text:

```r
config <- mai_config()
text <- mai_ask(config, provider, "Explain the World Bank mission in one sentence.")
```

The starter accepts the two supplied source route families only on the matched
Bank host, requires an explicit URL, sends a bounded Responses request, and
parses Responses text blocks. It does not assume `choices[[1]]` for Responses.
It does not prove that either supplied route is currently enabled.

## Local R Desktop

The local route requires Desktop approval, a compatible private SDK, approved
network/VPN, and browser login. The PIP source specifies Python no later than
3.12. Follow the approved uv/private-index instructions and bind `reticulate`
to that environment **before** Python initializes:

```r
install.packages("reticulate")
reticulate::use_virtualenv("/path/to/approved/.venv", required = TRUE)
Sys.setenv(MAI_ACCESS_TYPE = "desktop", MAI_ENV = "DEV",
           MAI_TEAM_NAME = "your-approved-team-name", MAI_SOURCE_TYPE = "interactive")
config <- mai_config()
provider <- mai_token_provider(config)
```

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
`mAI_factory_environment_setup.qmd`, and both supplied builder guides.
