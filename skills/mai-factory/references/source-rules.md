# Verify the API Contract

The supplied endpoint migration guide and its auth/OpenAI/Gemini/Bedrock
references resolve the older foundation-route and Desktop environment-name
conflicts. The historical builder guides and PIP `mAI*.qmd` articles remain
context for onboarding, Application Access, and Posit Connect content OAuth.
Their old Azure chat examples are not a current Responses contract.

The Desktop notice calls the new login Web Access Management (WAM). Do not
infer an OS-specific broker implementation from that name.

Original reference inputs are local ignored files, not distributed skill
resources. The notebook export contains credential-like and personal material;
do not copy its installation cells, credentials, outputs, or personal data.
Its Databricks introduction, old routes, and retired Desktop names do not
override the migration guide. Short-lived bearers are not permanent API keys.

Use the current platform contract for the chosen environment. Do not join a
path from one source to a base URL from another. Do not migrate an existing
working application until its current contract and target contract are known.

## Search Procedure

1. If an intranet search tool is available, search mAI Factory documentation,
   including `mai-factory-documentation.docx`, with this filter:

```json
{
  "logic": "AND",
  "conditions": [
    {"field": "siteurl", "operator": "ANY", "values": ["https://worldbankgroup.sharepoint.com/sites/aiwb"]},
    {"field": "contenttype", "operator": "ANY", "values": ["OneCMS_File"]}
  ]
}
```

2. Record the document title/date, environment, full route, request schema,
   required headers, SDK/version, and response shape. An example route is not
   sufficient evidence for all of these facts.
3. If intranet search is unavailable, open the platform documentation. If it is
   not accessible, ask for a current non-secret documentation excerpt or contact
   support. Do not claim that a tool searched the intranet when it did not.
4. You can generate local scaffolds, credential-store setup, health checks,
   validation, and mocked tests while verification is pending. Leave unverified
   model routes and schemas unset. Do not make a guessed invocation.

## Resolved Decisions

| Topic | Safe treatment |
| --- | --- |
| Desktop | Approved current private SDK and WAM setup under Desktop Access. Use `DesktopToken().get_token(env="DEV")`, `QA`, or `PROD`; retired `_DESKTOP` names are not a fallback. No device-code, MSAL device flow, or InteractiveBrowserCredential fallback |
| OpenAI root | Use `/maifactory/openai/` with trailing slash; SDK adds `responses`. Raw HTTP uses `/maifactory/openai/responses`, model in JSON. The old `/conversationalai/maifactory` foundation root is retired |
| Platform routes | Preserve `/conversationalai/platform` for health, DNR, tagging, translation, and TTS. Never remove the prefix globally |
| Gemini | Use `/maifactory/gemini/responses/{model}` or `/maifactory/gemini/models/{model}:generateContent` with native `contents`/`parts` and `generationConfig`. Set `google-genai` `api_version=""` and bearer in both `api_key` and Authorization. Grounding/Interactions needs separate verification |
| Bedrock | Raw HTTP `/maifactory/bedrock/model/{model_id}/converse`; Converse uses `content: [{"text": "..."}]` and `inferenceConfig`. No `anthropic_version`, typed Anthropic content, or boto3/SigV4 through APIM |
| Batch | The JSONL `url` and create `endpoint` must match; older example violates this |
| Embeddings | Verify the current route and API version; do not assume an Azure deployment route is a current unified route |
| Google Search | Newer source marks the standalone endpoint deprecated; verify Gemini grounding instead |
| Headers | Include the newer `x-team-name`; do not replace `x-source-type` with older Gemini `x-application-name` unless current docs require it |
| Token refresh | Tokens last about one hour. Tested OpenAI 3.35.1 supports a callable wrapper returning the actual `get_token` string per request. It is not an SDK `token_provider` method. Rebuild clients that capture strings, including Gemini, after refresh |
| Text extraction | OpenAI `output_text` can be empty. Also inspect structured `output[].content[].text`; handle incomplete/refused/tool/no-text states safely |
| Model controls | Preserve existing models/prompts/logic. Omit GPT-5 `temperature`; add output-token and reasoning controls only if supported |
| Quotas/prices/models | Check current documentation and entitlement; historical tables are not current guarantees |

These skills provide reference workflows, not a permission bypass or an
alternative to the approved platform contract.

The Desktop cutoff is **November 30, 2026**, and the Desktop monthly limit is
**50 million tokens**. Request extensions from
`itsai_platform_admin@worldbankgroup.org`. The supplied material does not state
an exact private SDK release, supported OS list, or OS-specific WAM settings.
Confirm those in current Desktop Access documentation rather than inventing a
broker configuration. Application, Connect, and Databricks identity do not change.
