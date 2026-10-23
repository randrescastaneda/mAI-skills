---
name: mai-databricks
description: Set up approved World Bank Databricks access to mAI Factory. Use for notebooks, clusters, managed workspace authentication, Data Lab onboarding, or failures when a local mAI example is moved to Databricks.
---

# mAI Factory in Databricks

Use the workspace team's approved integration. Do not assume a local Desktop
login, an environment variable, or a public Databricks tutorial applies.

The Desktop WAM migration does not replace Databricks managed identity or the
approved workspace service-principal flow. The supplied notebook export has a
stale Databricks introduction but later uses Desktop authentication. It is not
authority to run a personal Desktop login on a cluster. Do not copy its
credential-like installation data, personal information, source cells, or outputs.

## Provisioning

1. Confirm which World Bank workspace, cluster/runtime, team, and environment
   the user needs. Confirm data classification and approved use.
2. Check Data Lab approval through the [Data Lab Services request](https://worldbankgroup.service-now.com/wbg/en/itsai-data-lab-services-request?id=wbg_sc_catalog&sys_id=dadffc7987772d10205c42e9cebb3564).
3. Contact `SN-ITSAI-Datascience-Team-Admins@worldbankgroup.org` for provisioning
   and the approved notebook/cluster configuration. General platform onboarding
   is not proof of Databricks provisioning.
4. For IFC, ask support for the IFC-specific access process as well.
5. Obtain the approved identity method and exact current mAI route from the
   workspace team. The supplied guide describes workspace/cluster-managed
   identity or service-principal configuration; it does not specify an API for
   acquiring it. Do not invent `dbutils.secrets` scopes, serving endpoint names,
   Spark settings, environment names, or managed-identity code.

## Safe Notebook Setup

- Follow the provided runtime and package instructions. Do not run the local
   private-index installer or personal WAM/Desktop login on a shared cluster.
- Do not store personal bearer tokens, JFrog tokens, app secrets, or APIM keys
  in notebook cells, widgets, output, Spark configuration, or committed notebooks.
- Use only the team's approved credential/secret integration. Secret redaction
  in a notebook does not make unrestricted logging safe.
- Match DEV/QA/PROD host and scope. Hosts are `azapimdev.worldbank.org`,
  `azapimqa.worldbank.org`, and `azapim.worldbank.org`, respectively. The scopes
  are `a1dd6401-acf2-43b5-a37c-c3230ef1be7d/.default`,
  `c626bd72-9ef7-4efe-9176-5c75800f7670/.default`, and
  `0b3b356c-4b5f-4d5b-97ad-c99343ad5557/.default`.
- Set `x-source-type` to `interactive` for interactive notebook work and `job`
  for scheduled runs. Use the approved `x-team-name`. Include the subscription
  key if the team's Application Access contract requires it.
- Get a fresh bearer token from the approved provider for each request. Never
  persist a notebook's temporary access token as a reusable API key.

## Verification

1. Verify configuration locally without printing secret values.
2. With approval, test `GET https://<environment-host>/conversationalai/platform/health/`
   with a finite timeout and TLS verification. A healthy result proves only
   reachability, not model permissions or complete setup.
3. Check the current request contract in [mAI documentation](https://ai.worldbank.org/platform/documentation)
   or the workspace team's current example. The migration guide resolves
   foundation routes to root `/maifactory`: OpenAI `/openai/responses`, Gemini
   `/gemini/responses/{model}` or `/gemini/models/{model}:generateContent`, and
   Bedrock `/bedrock/model/{model_id}/converse`. Do not use retired foundation
   prefixes, or remove `/conversationalai/platform` from health and task APIs.
4. If a search tool supports intranet filters, restrict documentation search to
   `siteurl=https://worldbankgroup.sharepoint.com/sites/aiwb` and
   `contenttype=OneCMS_File`, including `mai-factory-documentation.docx`.
   If no current contract is available, request a non-secret excerpt and stop
   before generating a model call. Offline scaffolding remains possible.
5. Make one small call using public sample text. Record status, request ID,
   environment, model, SDK version, and UTC time, not tokens or notebook output.
6. Test the scheduled-job identity separately before production. A successful
   interactive notebook is not proof that the job identity has the same access.

## Troubleshooting and Handoff

Preserve models, prompts, and business logic when updating transport. OpenAI
uses Responses input/output with model in JSON and SDK base ending
`/maifactory/openai/`. Gemini uses native `contents`/`parts`; `google-genai`
requires `api_version=""` and bearer in both `api_key` and Authorization.
Grounding/Interactions needs separate verification. Bedrock uses raw HTTP
Converse with model ID in the path, not Anthropic native fields or SigV4 SDKs.

Keep `Authorization`, actual `x-source-type`, approved team attribution, and
any required application subscription key on every call. Use the workspace
provider's documented refresh policy. Rebuild clients that captured bearer
strings after refresh, including Gemini; do not reuse an expired notebook token.
OpenAI `output_text` may be empty, so also inspect structured output text.
Omit GPT-5 `temperature`; use reasoning/output controls only when supported.

For 401, check identity, expiry, and audience locally. For 403, check workspace
provisioning and network/ACN approval. For 404/422, check the current route and
schema. For 429, distinguish a temporary rate limit from exhausted quota.
Do not disable TLS, move data to a public provider, or retry without a bound.

Send only a sanitized error summary, UTC time, request ID, environment, runtime,
and cluster/workspace identifier permitted by policy to the Data Science team.
Platform support: `itsai_platform_admin@worldbankgroup.org`.

Historical source (not bundled): `mai-factory-builder.md`, Databricks Access
section. The supplied endpoint migration guide resolves foundation transport,
not workspace token acquisition. Local source inputs are not distributed.
Current workspace instructions take priority for managed identity setup.
