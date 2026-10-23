---
name: mai-python
description: Build a secure Python starter for World Bank mAI Factory. Use for WAM or device-code migration, DesktopToken, Application Access, uv/private SDK installation, OpenAI Responses, token refresh, environment configuration, LangChain setup, or a first Python connection test.
---

# Python Starter

Use [mai_client.py](assets/mai_client.py) as a small synchronous learning
starter, not a production service. It supports Desktop and Application Access,
keeps credentials out of code, and checks environment/route consistency.

## Before Setup

Confirm onboarding, execution location, team name, and DEV/QA/PROD. Use the
[standard request](https://worldbankgroup.service-now.com/wbg/en/itsai-platform-on-boarding-request?id=wbg_sc_catalog&sys_id=7715cc6d93ac96d0a2f6fd647aba1042)
for World Bank staff; IFC must get its specific form from platform support.
For Databricks, use Data Lab provisioning, not this local workflow.
Do not make live calls before approval. VPN/network restrictions can apply;
the source recommends US East VPN for Desktop and platform exceptions on Mac.
The precise PIP network rule is: US East outside DC or off `bluemarlin`;
connected GlobalProtect is sufficient on DC `bluemarlin`.

## Install Dependencies

Use the user's project directory, not the installed skill directory. Inspect
existing project files before changes. Do not overwrite project configuration.

```bash
uv init --python 3.12
uv add 'openai==3.35.1' requests keyring
```

Run `uv init` only for a new project. Older PIP guidance used Python no later
than 3.12. This is not proof of current WAM SDK/runtime compatibility. Confirm
the approved current private SDK and supported runtime in Desktop Access docs.
This is separate from the Node requirement for skill installation.
OpenAI 3.35.1 is the tested SDK release for this starter. Verify current
platform support before a live call or a dependency upgrade.
For Application Access also run:

```bash
uv add azure-identity
```

For Desktop Access, install private `itsai-platform` with the approved Bank
JFrog credentials. Merge the named-index entries in
[the uv configuration](assets/desktop-index.toml) into `pyproject.toml`.
Do not put credentials in the index URL. Follow
[private-index setup](references/setup.md), then run:

```bash
uv add itsai-platform
```

For an existing uv project, upgrade the locked private SDK through that
approved index. `uv add` alone can retain an older release:

```bash
uv lock --upgrade-package itsai-platform
uv sync
```

Check the installed release against current Desktop Access requirements.

The named, explicit index prevents unrelated packages from resolving there.
Never use a public look-alike for the private SDK. Do not bypass TLS or private
index authentication. Complete Web Access Management (WAM) setup under
**Desktop Access** in current platform documentation. The supplied material
does not specify an exact SDK release, supported OS list, or OS-specific WAM
configuration.

The final Desktop migration cutoff is **November 30, 2026**, with a **50 million
token monthly limit**. Contact `itsai_platform_admin@worldbankgroup.org` for
extensions. Use `DesktopToken().get_token(env="DEV")`, `QA`, or `PROD`; never
use retired `_DESKTOP` suffixes or `DesktopToken.token_provider`. Do not add
device-code, MSAL device flow, or `InteractiveBrowserCredential` fallback.
Application client credentials, scopes and APIM requirements do not change.

## Configure Without Secrets

Create the project starter from the bundled asset. Use
[the non-secret settings template](assets/.env.example) as a list of settings; the
starter deliberately does not load `.env` files. Set non-secret variables in
the runtime environment or an approved configuration system:

```bash
export MAI_ENV=DEV
export MAI_ACCESS_TYPE=desktop
export MAI_TEAM_NAME=your-approved-team-name
uv run python mai_client.py check
```

PowerShell equivalent:

```powershell
$env:MAI_ENV = "DEV"
$env:MAI_ACCESS_TYPE = "desktop"
$env:MAI_TEAM_NAME = "your-approved-team-name"
uv run python mai_client.py check
```

`check` performs no login, reads no credential store, and sends no network
request. For Application Access, set `MAI_ACCESS_TYPE=application`,
`AZURE_TENANT_ID`, and `AZURE_CLIENT_ID`. Provision `AZURE_CLIENT_SECRET` and
`APIM_SUBSCRIPTION_KEY` through the approved runtime secret system or the OS
store service `worldbank-mai/DEV`, with those exact account names. Do not paste
values into agent chat or commands. App secrets take precedence from the
process environment, then the OS store. Backend services must use their
approved secret service instead of a developer's OS store.

## First Live Test

Only after access approval, use public sample data:

```bash
uv run python mai_client.py health
```

This acquires a fresh token and sends a finite-timeout health request. A
healthy result proves reachability, not model entitlement. Application
requests include the APIM subscription key; all requests include team/source
headers. Redirects on the health request are rejected.

Before adding a model call, verify the exact environment-specific OpenAI SDK
base URL, deployment name, request schema, and supported SDK version against
current [mAI documentation](https://ai.worldbank.org/platform/documentation).
The migration guide resolves the SDK base to `/maifactory/openai/`, with the
trailing slash. DEV uses
`https://azapimdev.worldbank.org/maifactory/openai/`. The starter rejects the
retired foundation root below `/conversationalai/maifactory`. Health remains at
`/conversationalai/platform/health/`. Do not globally remove that prefix or set
a public OpenAI endpoint. The model must still be approved for this identity.

If intranet search is available, filter `siteurl` to
`https://worldbankgroup.sharepoint.com/sites/aiwb` and `contenttype` to
`OneCMS_File`, including `mai-factory-documentation.docx`. If current evidence
is unavailable for an unconfirmed feature, request a non-secret excerpt or
contact support. Generate offline scaffolding, not a guessed invocation.

After verification, set `MAI_OPENAI_BASE_URL` to the canonical SDK base ending
in `/maifactory/openai/` (not `/responses`), and `MAI_MODEL` to the approved
deployment. The settings template supplies the DEV base; it does not auto-load:

```bash
uv run python mai_client.py ask --prompt "Explain the World Bank mission in one sentence."
```

The SDK appends `responses` and sends the model in JSON. The starter calls
`client.responses.create` with `max_output_tokens=128`. Only use this control
on a supported model. Omit `temperature` on GPT-5; add `reasoning` only when
supported, not as a universal default. Preserve existing models, prompts, and
business logic when migrating an application.

OpenAI 3.35.1 supports the starter's `api_key` callable. Its in-memory wrapper
returns the actual `credential.get_token(env="DEV")` string at request time;
it does not call a `DesktopToken.token_provider` method. Desktop tokens last
about one hour. Rebuild a client that captured a string after refresh instead
of assuming every SDK supports the callable. For Gemini this includes both
`api_key` and the captured Authorization header.

Responses `output_text` may be empty. The starter also reads text from
`output[].content[].text` and fails safely when no text is available. It
displays response text only for this explicit command. Do not pass sensitive
prompts as CLI arguments; production applications must obtain inputs through
an approved interface.

## Adapt Safely

- For an async service, use the approved async SDK/identity pattern, finite
  timeouts, and bounded concurrency. Keep business logic outside API handlers.
- LangChain: verify `langchain-openai` compatibility, use `ChatOpenAI` with
  `use_responses_api=True`, the same verified base, `api_key=token_provider`,
   and the same headers only if its installed version supports that hook.
   Otherwise follow its documented refresh/rebuild method.
- Use `x-source-type=job` for unattended workloads; do not change it merely
  to avoid a limit. The starter derives it from access type for its local/app
  examples; adapt it to the actual approved workload.
- Keep default retries off until the error policy is defined. Do not stack SDK
  and outer retries. A timeout may leave an accepted request on the server.
- Do not log SDK exception bodies, headers, tokens, prompts, or model output.
  The starter emits sanitized diagnostics and HTTP status only.
- Reject redirects for both health and model requests. Even when a client
  strips Authorization, a redirect can forward the APIM key or request body.
- Check current deployment availability at [the model catalog](https://ai.worldbankgroup.org/maifactory/).

Complete when offline configuration, approved network/auth, and one small
verified call pass. Record the environment, model, SDK version, and status,
not credentials. Support: `itsai_platform_admin@worldbankgroup.org`.
