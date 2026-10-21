# Verify the API Contract

The supplied source files are not one consistent API specification.
`mai-factory-builder.agent.md` describes older routes below
`/conversationalai/maifactory`. `mai-factory-builder.md` describes newer
foundation routes below `/maifactory` and requires current documentation search.
The PIP `mAI*.qmd` articles document Desktop setup and Posit Connect OAuth for
R/Shiny. Their legacy Azure chat requests are not a current Responses contract.
Short-lived bearer tokens are not permanent API keys.

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

## Known Conflicts

| Topic | Safe treatment |
| --- | --- |
| OpenAI root | Verify `/maifactory/openai/` versus `/conversationalai/maifactory/openai/`; SDK adds `responses` itself |
| Gemini | Newer source lists Generate Content; older source lists Interactions and deprecated chat routes. Do not use one payload with another API |
| Bedrock | Converse uses `content: [{"text": "..."}]`; Anthropic native uses typed blocks and `anthropic_version`. Do not mix request/response shapes |
| Batch | The JSONL `url` and create `endpoint` must match; older example violates this |
| Embeddings | Verify the current route and API version; do not assume an Azure deployment route is a current unified route |
| Google Search | Newer source marks the standalone endpoint deprecated; verify Gemini grounding instead |
| Headers | Include the newer `x-team-name`; do not replace `x-source-type` with older Gemini `x-application-name` unless current docs require it |
| Token refresh | Pass a callable when the SDK supports it, not `token_provider()` evaluated at construction |
| Quotas/prices/models | Check current documentation and entitlement; historical tables are not current guarantees |

These skills provide reference workflows, not a permission bypass or an
alternative to the approved platform contract.
