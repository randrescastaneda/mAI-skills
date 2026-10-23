---
name: mai-credentials
description: Obtain and protect World Bank mAI Factory credentials. Use for WAM or device-code migration, DesktopToken, API keys, APIM subscription keys, bearer tokens, JFrog tokens, Azure app credentials, keyring, environment files, Azure Key Vault, rotation, or accidental credential disclosure.
---

# mAI Credentials

First identify the access type and the credential. They are not interchangeable.
Never ask a user to paste a secret into agent chat or an agent tool call.

## Credential Types

| Item | Issuer / approved acquisition | Purpose |
| --- | --- | --- |
| Desktop bearer token | Approved onboarding and WAM setup, then current private `itsai-platform` `DesktopToken` | Short-lived access to mAI; no static bearer login default |
| Application bearer token | Entra client-credentials flow with approved app registration | Short-lived access; refresh through the credential provider |
| APIM subscription key | mAI Factory team after Application Access approval | Additional gateway header, not a substitute for a bearer token |
| Tenant ID and client ID | Approved app registration/ACN owner | Identify tenant and application; IDs are not secrets but do not invent them |
| Client secret | Approved app registration process / app owner | Confidential app authentication, with an expiry |
| JFrog token | Approved Bank Artifactory/JFrog account process | Download private packages such as `itsai-platform`; NOT an mAI API key |
| Posit Connect `API_KEY` | Approved Connect account/content configuration | Authenticate to Connect, not to mAI or public OpenAI |
| `OAUTH_INTEGRATION_GUID` | Approved Connect mAI OAuth integration | Non-secret integration identifier passed as `audience`; not a token |
| Manually obtained access token | Only the current platform-approved flow | Temporary legacy R/HTTP use; not a permanent API key |

Do not request a public OpenAI, Google, or AWS account/key for mAI. Do not
automate portal login, copy browser cookies, or extract another application's
stored token. Never make up a key-creation page or permission.

## Get Access

1. Confirm onboarding with the [standard request](https://worldbankgroup.service-now.com/wbg/en/itsai-platform-on-boarding-request?id=wbg_sc_catalog&sys_id=7715cc6d93ac96d0a2f6fd647aba1042).
   For IFC, get the IFC-specific form from `itsai_platform_admin@worldbankgroup.org`.
2. For local Desktop Access, complete WAM setup under **Desktop Access** in the
   current platform documentation and install the approved current private SDK.
   Use `DesktopToken().get_token(env="DEV")` (`QA` or `PROD` when approved).
   The returned bearer is a string. Do not save that token
   to source files or request an application secret just to use a local notebook.
3. For Application Access, ask the approved owner/team to provision tenant ID,
   client ID, client secret, scope, APIM key, app permissions, and ACN/network
   access. DEV approval is not QA/PROD approval. Record expiry/rotation ownership.
4. For R/Shiny on internal Posit Connect, use the approved content OAuth
   integration. This documented path does not require Desktop onboarding.
   Set `API_KEY` and `OAUTH_INTEGRATION_GUID` through protected Connect content
   settings. Obtain the bearer through `get_oauth_content_credentials`, not
   a copied token in a notebook. Confirm current integration permissions.
5. For Databricks, use the [Data Lab request](https://worldbankgroup.service-now.com/wbg/en/itsai-data-lab-services-request?id=wbg_sc_catalog&sys_id=dadffc7987772d10205c42e9cebb3564)
   and `SN-ITSAI-Datascience-Team-Admins@worldbankgroup.org`.
6. If a portal step or permission is unclear, ask support for current instructions.
   Do not promise that this skill itself can issue credentials.

The final Desktop migration cutoff is **November 30, 2026**. Desktop Access has
a **50 million token monthly limit**. Web Access Management (WAM) replaces the
old Desktop login path. Request extensions from
`itsai_platform_admin@worldbankgroup.org`. The supplied material does not state
an exact SDK version, supported OS list, or OS-specific WAM settings. Confirm
those in the current Desktop Access documentation. Never add a device-code,
MSAL device flow, or `InteractiveBrowserCredential` fallback.

## Save Secrets

Prefer an approved OS credential store for local work and Azure Key Vault or
the approved platform secret service for deployed work. Never write secrets to
the installed skill directory, `node_modules`, an agent rules file, a notebook,
or a tracked repository file. Avoid cloud-synced folders for local secrets.

The [credential-store helper](scripts/store_credentials.py) uses Python
`keyring` and hidden terminal input. The user must run it in their own terminal,
not through an agent terminal session. Agent terminal output can be recorded.

```bash
uv add keyring
uv run python /path/to/mai-credentials/scripts/store_credentials.py --env DEV --kind application
```

The helper stores `AZURE_CLIENT_SECRET` and `APIM_SUBSCRIPTION_KEY` under service
`worldbank-mai/DEV` (or QA/PROD). It does not issue or validate credentials.
Use `--kind jfrog` for `JFROG_TOKEN`; use `--kind bearer` only for a temporary,
approved legacy workflow. Use `--delete` with the same options to remove them.
It rejects plaintext/fallback keyring backends; it will not silently write a
file when a secure OS store is unavailable.

Use non-secret environment variables for `MAI_ENV`, `MAI_ACCESS_TYPE`,
`MAI_TEAM_NAME`, `AZURE_TENANT_ID`, and `AZURE_CLIENT_ID`. The Python starter
reads app secrets from environment variables first, then this OS store.
The R skill shows the corresponding R `keyring` workflow.

If policy requires local environment files, read
[the storage and rotation rules](references/storage.md). Environment variables
are a transport mechanism, not encrypted storage.

## Match the Environment

| Environment | Gateway host | Scope | Desktop SDK name |
| --- | --- | --- | --- |
| DEV | `azapimdev.worldbank.org` | `a1dd6401-acf2-43b5-a37c-c3230ef1be7d/.default` | `DEV` |
| QA | `azapimqa.worldbank.org` | `c626bd72-9ef7-4efe-9176-5c75800f7670/.default` | `QA` |
| PROD | `azapim.worldbank.org` | `0b3b356c-4b5f-4d5b-97ad-c99343ad5557/.default` | `PROD` |

The retired Desktop names with `_DESKTOP` suffixes are not a fallback. Keep
Application scopes and APIM keys unchanged and matched to the environment.

Desktop tokens last about one hour. For OpenAI 3.35.1, a tested `api_key`
callable can wrap the actual `credential.get_token(env="DEV")` string per
request. This local wrapper is not an SDK `token_provider` method. For clients
that capture strings, rebuild after refresh. Gemini needs the refreshed bearer
in both `api_key` and `Authorization`. Raw HTTP obtains a fresh provider result
before each request. Do not assume one token lasts for a full notebook or job.

## Private SDK Installation

The documented private index is
`https://artifactory.worldbank.org/artifactory/api/pypi/itsdt-pypi-virtual/simple`.
Get approved JFrog access separately. The PIP environment guide documents:

1. Sign in to [Bank Artifactory](https://artifactory.worldbank.org/ui/login)
   with OpenID OAuth after onboarding and network approval.
2. Open `itsdt-pypi-virtual/itsai-platform`, then **Set Me Up**.
3. Change the client from **Poetry** to **Pip**.
4. Use **Get token & Generate Instructions** to obtain a download token.
5. A "no deploy permissions" notice does not block package downloads. Do not
   request deployment rights just to install the SDK. If login fails with 400,
   check approval and VPN; use the documented browser retry or contact ITS
   with the request number, not credentials. Stop if the current portal differs.

The older examples embed credentials in
`UV_INDEX`; do not put such URLs in shell history, `.env`, logs, `pyproject.toml`,
or a lock file. Prefer approved package-manager credential integration.

The Python skill includes a named-index configuration which scopes only
`itsai-platform` to the private index. Do not add untrusted indexes, bypass TLS,
or expose a JFrog token to a public index. Do not run `env`, `set`, credential
store dumps, or verbose HTTP logging for troubleshooting.

Existing uv projects must upgrade the locked private SDK, not just repeat
`uv add`. With approved private-index authentication configured, run
`uv lock --upgrade-package itsai-platform` and `uv sync`, then check the release
against current Desktop Access requirements. Do not invent a minimum version.

The PIP shared-environment option can avoid repeated SDK downloads, but does
not secure a plaintext token. Prefer project environments for reproducibility.
If using a shared approved environment, keep it outside repositories, protect
its directory, record versions, and use its actual activation path (`.venv`
with uv by default). Do not copy the source's inconsistent Windows `venv` path.
The Desktop SDK may cache tokens; the sources do not document cache location,
encryption, permissions, or retention. Do not invent or manipulate cache files.

## Completion

Confirm only credential presence, environment, storage method, and rotation
owner. Do not print values or token fragments. If a credential was disclosed,
revoke/rotate it first and review access logs. Deleting the visible text or Git
commit alone does not make it safe.

Sources: PIP `mAI*.qmd` credential workflows, historical builder guides, and the
2026-10-23 Desktop migration notice and endpoint/auth migration guide. These
local source inputs are not distributed. Do not copy credentials or personal
data from the supplied notebook export into project files.
Current policy and [mAI documentation](https://ai.worldbank.org/platform/documentation)
take priority. Support: `itsai_platform_admin@worldbankgroup.org`.
