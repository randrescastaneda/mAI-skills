---
name: mai-foundation-models
description: >-
  Build World Bank mAI Factory foundation model integrations. Use for OpenAI
  Responses, LangChain, tool calls, streaming, embeddings, Gemini Generate
  Content, Claude Bedrock Converse, model selection, or migration from legacy
  mAI model routes. Includes independent access setup and schema verification.
---

# mAI Foundation Models

Use this skill to design or repair model integrations through the World Bank
mAI Factory gateway. It has no dependency on another skill.

## Start Here

1. Confirm the correct onboarding or content-integration approval before a live
   call. Identify Desktop, Application, Databricks, or Posit Connect Access,
   the target environment, team name, and actual workload.
2. Read [Access and Verification](references/access-and-verification.md).
   It includes installation, scopes, token providers, required headers, the
   intranet search filter, and the fallback when current schemas are not available.
3. Select the service and verify its current gateway contract. Record the source
   title, date, environment, route, schema, and supported SDK version.
4. Generate invocation code only after this verification. Otherwise provide an
   offline scaffold, test plan, and a list of missing non-secret schema details.
5. Test one small, non-sensitive request after approval. Add larger workloads,
   tools, and streaming only after the basic response is correct.

Do not use the legacy guide as a current API specification. Do not combine a path
from one guide with a payload or parser from another guide.

## Endpoint Discovery

The supplied migration guide resolves the generation routes below. Embeddings,
streaming, tools, model entitlements, and feature limits still need current
documentation. Paths are host-relative; do not add `/maifactory` twice.

| Service | Discovery path | Contract to verify |
| --- | --- | --- |
| OpenAI Responses | `/maifactory/openai/responses` | Responses request and output events |
| OpenAI embeddings | `/maifactory/openai/embeddings` | Deployment, input limits, dimensions |
| Gemini Generate Content | `/maifactory/gemini/responses/{model}` | Native contents, parts, tools, candidates |
| Gemini native alternative | `/maifactory/gemini/models/{model}:generateContent` | Same native contents/parts body |
| Gemini embeddings | `/maifactory/gemini/embeddings/{model}` | Native or gateway embedding format |
| Bedrock Converse | `/maifactory/bedrock/model/{model_id}/converse` | Converse content blocks and output |
| Bedrock streaming | `/maifactory/bedrock/model/{model_id}/converse-stream` | Gateway stream transport and events |

The reference environment bases are `https://azapimdev.worldbank.org/maifactory`,
`https://azapimqa.worldbank.org/maifactory`, and
`https://azapim.worldbank.org/maifactory`. Keep each base coupled to its scope in
the access reference. A host-relative path is not an SDK base URL.

Retire old foundation routes below `/conversationalai/maifactory` and old
Gemini chat routes. Preserve `/conversationalai/platform` for health and task
APIs. Migrate transport only: keep the caller's model, prompts, and business
logic. Do not add uploads or grounding when the existing client did not use them.

## Model Selection

- Read the [current model catalog](https://ai.worldbankgroup.org/maifactory/).
  Confirm that the exact deployment is enabled for this environment and identity.
- Choose the smallest approved model that meets quality, latency, context,
  modality, tool, and residency requirements. Run a representative evaluation.
- Keep model IDs, versions, context limits, pricing, quota, and retirement dates
  in configuration. Do not embed the source guides' example catalog as current.
- Verify input, cached-input, output, and tool charges in current platform pricing.
  Do not promise a fixed price, discount, token limit, or model availability.
- For an unavailable model, use the approved request process and platform support.
  Do not route directly to a public provider to bypass mAI access controls.
- The supplied guide requires Data Zone Standard, not Global Standard, for new
  deployments, with OIS validation, private networking, and content safety.
  Confirm current policy with the platform team before a new-model request.

## OpenAI Responses and LangChain

Verify the OpenAI-compatible SDK base, the path the client appends, the installed
SDK's token-provider support, API-version requirements, and gateway-supported
Responses features. Do not assume Azure deployment clients and `OpenAI` clients
use interchangeable base URLs.

After access approval, a DEV client can use the provider from the access
reference. Configure the variables, then enable this construction scaffold;
it does not make a request:

```python
from collections.abc import Callable
from openai import OpenAI

token_provider: Callable[[], str]  # Use the access reference's provider.
metadata_headers: dict[str, str]  # Team, workload, and app key if applicable.

# OpenAI 3.35.1 is tested with this callable hook.
# Configure the provider and headers before constructing the client.
# client = OpenAI(
#     base_url="https://azapimdev.worldbank.org/maifactory/openai/",
#     api_key=token_provider,
#     default_headers=metadata_headers,
#     timeout=30,
#     max_retries=0,
# )
```

The trailing slash is required. The SDK appends `responses`; raw HTTP uses
`POST /maifactory/openai/responses`, with the model in JSON. Do not use
`AzureOpenAI` deployment chat or `client.chat.completions.create` for this target.

For the tested OpenAI 3.35.1 hook, the callable returns the actual `get_token`
string per request. It is a local wrapper, not `DesktopToken.token_provider`.
Do not add a saved bearer to `default_headers`. For a client that captures a
string, refresh and rebuild before expiry at about one hour. Do not assume
that every OpenAI or LangChain release supports this callable.

For Responses, verify `model`, `input`, instruction handling, output-token controls,
structured output, storage controls, and allowed built-in tools. Generate the
request from the verified schema, not from a Chat Completions example.

Map system/user text to `instructions` and `input`, and use
`max_output_tokens` only on a model that supports it. Omit `temperature` on
GPT-5 models. Add `reasoning` only when supported; do not add it to every model.
Prefer non-empty `output_text`; if empty, walk text in
`output[].content[].text` without assuming a fixed output index. Handle no text,
tool calls, refusals, and incomplete states without dumping the raw response.

- Read structured output items as well as text. A text convenience property can
  omit tool calls, citations, refusals, or incomplete-output details.
- Continue conversations only with documented state or input replay. Check data
  retention and identity scope before storing response identifiers.
- For LangChain, verify the installed `langchain-openai` integration supports
  `use_responses_api=True`, the selected model, and the gateway credential hook.
- Set the model, verified SDK base, provider, timeout, and metadata headers on
  `ChatOpenAI`. Start with retries disabled; add one bounded policy after tests.
- Use `invoke`/`ainvoke`, `stream`/`astream`, or prompt pipelines only after route
  and message conversion tests pass. Check that wrappers preserve structured
  output, usage, citations, and tool-call identifiers.
- Pin a tested dependency range in the user's project. Do not assume a version
  number quoted by the legacy guide still defines current compatibility.

## Tool Calls

1. Verify the provider-specific tool schema and whether each tool runs at the
   provider or in the application. A model tool request is not tool execution.
2. Expose a small allowlist with strict argument schemas. Reject unknown tools,
   invalid arguments, unexpected fields, and unauthorized resource access.
3. Treat tool arguments and retrieved text as untrusted data. Do not execute
   shell text or SQL directly. Require approval for state changes and data export.
4. Match each result to its original call ID in the documented result envelope.
   Do not insert an OpenAI tool result into Gemini or Converse messages.
5. Bound tool rounds, parallelism, time, and output size. Return a safe failure
   when a tool fails; do not invent successful tool output.
6. Preserve verified citations for built-in search. Check sources independently
   before official use. Do not enable a tool merely because its provider offers it.

## Streaming

- Confirm that the gateway supports streaming for this model and route. Verify
  the content type, framing, event schema, final event, and error events.
- OpenAI SSE, Gemini streams, and Bedrock event streams are not interchangeable.
  Do not decode all providers with a generic `data:` line parser.
- Use bounded connection, read, and overall deadlines. Close streams on user
  cancellation. Keep partial text separate from a completed response.
- Assemble tool arguments according to documented fragment order and IDs.
  Validate the complete arguments before tool execution.
- Capture final usage and completion state when supplied. Handle interrupted,
  refused, and incomplete responses without treating them as success.
- Do not replay a partially consumed stream automatically. Assess duplicate
  charges and tool side effects first. Do not log event payloads.

## Embeddings

Verify both the model deployment and its embedding route. The legacy Azure
deployment route and the newer root embedding route must not be combined.

1. Confirm input type, batch limits, token limits, task type, dimensions,
   normalization, and output ordering in current docs.
2. Use a refresh-capable credential hook, including with a verified
   `AzureOpenAIEmbeddings` or OpenAI-compatible embedding integration.
3. Chunk source text with stable document and chunk IDs. Keep restricted source
   data and vectors in approved storage; vectors can contain sensitive information.
4. Validate vector count, finite numeric values, dimension, and input association.
   Do not assume Gemini returns OpenAI's `data[].embedding` format.
5. Use the same model, version, dimensions, and compatible task configuration for
   indexing and queries. Rebuild or version the index when these change.
6. Bound concurrency and batch size. Log counts, sizes, and status, not source
   text, vectors, or full payloads.

## Gemini Native Generation

Use native Generate Content at either canonical Gemini route in the table.
Both use native `contents` containing `parts`, optional `systemInstruction`,
and `generationConfig`, not OpenAI `input` or legacy chat `messages`.

For `google-genai`, configure `types.HttpOptions` with:

```python
from google import genai
from google.genai import types

# Use the configured provider and metadata from the local access reference.
access_token = token_provider()
client = genai.Client(
    api_key=access_token,
    http_options=types.HttpOptions(
        base_url="https://azapimdev.worldbank.org/maifactory/gemini",
        api_version="",
        headers={**metadata_headers, "Authorization": f"Bearer {access_token}"},
    ),
)
```

Set the bearer string in both client `api_key` and the `Authorization` header.
Always include actual `x-source-type` and approved team attribution. An empty
`api_version` is required to prevent the SDK inserting `/v1beta/` and causing
an APIM 404. Rebuild the client after token refresh at about one hour.

- For a verified native Generate Content route, use its documented `contents`,
  parts, generation settings, safety settings, tool declarations, and candidates.
  Preserve existing generation settings under `generationConfig`; for example,
  `max_tokens` maps to `maxOutputTokens`. Verify model-specific support.
- Do not send Responses-style `input` and `instructions` to a native route on
  the assumption that the gateway translates them.
- Extract text from `candidates[].content.parts[].text` or the SDK `.text`
  property. Handle safety blocks, empty candidates, and non-text parts safely.
- Do not use `aiplatform.googleapis.com` or GCP ADC as an APIM workaround.
- Do not switch to `client.interactions.create` because an old example uses it.
  Migrate legacy clients only after the current target contract is verified.
- Grounding with Google Search is a separate contract. The supplied migration
  reference identifies an Interactions path for existing grounding clients;
  verify its exact route, tool schema, model, metadata, and citations. Do not
  switch generation to Interactions or assume grounding on a native/chat route.
- Only if files were already uploaded, verify the existing DEV/QA helpers under
  `/maifactory/gemini/gcs/uploads`. Use `gs://` URIs in native `fileData.fileUri`,
  not HTTPS file URIs or OpenAI `input_file` blocks. Do not add an upload workflow.
- Verify any model-listing route before use. A failed undocumented `GET /models`
  is not evidence that inference access is unavailable.

## Claude and Bedrock

Use only a model on the platform's current **US residency allowlist** with a
`us.` model ID. Prefix checks alone do not establish availability or approval.
Verify the inference profile, permitted US regions, data handling, and account
policy with the platform. Do not use `global.` or an unprefixed replacement when
US routing is required. Do not claim a prefix alone guarantees compliance.

Use raw HTTP, such as `requests`, for
`POST /maifactory/bedrock/model/{model_id}/converse`. Keep the caller's approved
model ID in the path. Do not use boto3/botocore SigV4 through APIM.

Keep these two protocols separate:

| Protocol | Schema family to confirm | Typical response family |
| --- | --- | --- |
| Bedrock Converse | `messages` with content blocks such as `{"text": "..."}`, `system` blocks, `inferenceConfig`, optional `toolConfig` | `output.message.content`, `stopReason`, `usage` |
| Anthropic native / InvokeModel | `anthropic_version`, `max_tokens`, content blocks with `type` | Native `content` and native stop/usage fields |

For this migration, use Converse `messages[].content[].text`, `system` text
blocks, and `inferenceConfig.maxTokens`. Do not send `anthropic_version`, native
`max_tokens`, or typed Anthropic text blocks to Converse. Parse
`output.message.content[].text` and camelCase usage fields such as `inputTokens`
and `outputTokens`. Verify model-specific tools and other optional features.

For Converse tools, verify `toolUse`/`toolResult` blocks and stop reasons. For
Converse streaming, verify the gateway's event transport rather than assuming
SSE or raw line-delimited JSON. Resolve the selected model ID once in validated
configuration; do not mix `MODEL_ID` and `model_id` variables.

## Verification and Delivery

Deliver environment/access assumptions, the verified source, dependency setup,
safe credential configuration, the smallest complete example allowed by the
verified schema, and offline tests. Test request serialization and response
parsing with synthetic fixtures before approved live tests.

For the first approved migration smoke test, request only
`Reply with the single word: pong`. Check HTTP 200 and extracted text starting
with `pong`, case-insensitive. Do not treat an unrelated missing local module
or data file as a migration regression, or change application logic to hide it.

Check authentication refresh, required headers, malformed requests, incomplete
output, tool denial, stream cancellation, and rate-limit behavior. Retry only
confirmed transient errors with a bounded budget and quota-aware backoff. Do not
retry access failures or repeat side effects blindly. Never change workload
headers to seek a longer timeout or a different quota.

Never log tokens, full headers, SAS URLs, or request/response payloads. Do not
bypass VPN, TLS, permissions, content safety, or residency controls. AI output
needs independent review before official use.

## Sources

- Historical sources (not bundled): `mai-factory-builder.md` and
  `mai-factory-builder.agent.md`. The supplied endpoint migration guide and
  auth/OpenAI/Gemini/Bedrock references take priority for this transport update.
  Local source inputs are not distributed; never copy credentials, personal
  data, source cells, or outputs from the supplied notebook export.
- Access facts from the PIP guidelines: `mAI_factory_API_setup_prerequisities.qmd`,
  `mAI_factory_setup_access_request.qmd`, `mAI_factory_environment_setup.qmd`,
  and `mAI_integration.qmd`. They do not verify current API contracts.
- [Current platform documentation](https://ai.worldbank.org/platform/documentation)
- [Current models](https://ai.worldbankgroup.org/maifactory/)
- Platform support: `itsai_platform_admin@worldbankgroup.org`
