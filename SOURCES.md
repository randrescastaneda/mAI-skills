# Source Inventory and Decisions

Reviewed on 2026-10-23. This is the source inventory and decision record for the
Desktop Web Access Management (WAM) and foundation endpoint migration. It is not
a claim that live mAI endpoints, WAM login, or current model entitlements were verified.
All implementation work is in `mAI-skills`; no source project was changed.

## Complete Inventory

The source project is `GPID/Pip-Technical-Guidelines` in the local project
collection, with upstream [GPID-WB/Pip-Technical-Guidelines](https://github.com/GPID-WB/Pip-Technical-Guidelines).
A recursive search found exactly four `mAI*.qmd` files, all at its root.
All four files and both builder guides listed below were read in full during
the original work. All six migration inputs listed in the second table were
read in full for this update.

| Source | Lines | Main coverage | Skills informed |
| --- | --- | --- | --- |
| `mAI_factory_API_setup_prerequisities.qmd` | 122 | Access/token distinction, Python compatibility, GlobalProtect, uv setup | Factory, credentials, Python, troubleshooting |
| `mAI_factory_setup_access_request.qmd` | 51 | Per-user onboarding, form selections, IFC and Connect exceptions | Factory, credentials, R |
| `mAI_factory_environment_setup.qmd` | 315 | Artifactory token steps, private index, DesktopToken, health, older Azure client, environment persistence | Factory, credentials, Python, R, troubleshooting |
| `mAI_integration.qmd` | 202 | R/Shiny on internal Posit Connect, content OAuth, audit headers, older Azure chat request | Factory, credentials, R, troubleshooting |
| `mai-factory-builder.agent.md` | 1,474 | Desktop/Application Access, models, Responses, embeddings, batch, Gemini, Claude, DNR, task APIs, FAQ | All API and troubleshooting skills |
| `mai-factory-builder.md` | 318 | New route discovery, current-documentation requirement, team header, Databricks provisioning | All skills |

The original spelling `prerequisities` is retained to identify the source.
The R article declares 2026-06-09. The builder guides do not establish
their publication sequence; "new-route guide" below identifies its content,
not a verified platform release date. References in skills use source names
and live documentation links so each installed skill remains self-contained.

The two builder guides are historical inputs and are not tracked in this
repository. The derived skills do not repeat their entire text or make a new
license claim about Bank documentation.

### Migration Inputs

These local inputs are under the ignored directory
`reference/maifactory-endpoint-migration`. They are not distributed in the npm
package or website. The file with an `.ipynb` suffix is a text-cell export, not
a JSON notebook.

| Source | Lines | Main coverage | Authority in this update |
| --- | --- | --- | --- |
| `SKILL.md` | 157 | DesktopToken environments, transport-only migration, foundation roots, headers and smoke test | Current migration instructions take priority over older route examples |
| `mai-factory-sdk-desktop.ipynb` | 554 | Private SDK setup, Desktop example, older foundation calls, DNR and tagging | Historical context only; stale Databricks introduction, old environment names and endpoints are not active instructions |
| `references/auth.md` | 86 | `DesktopToken().get_token`, removal of device-code/interactive fallback, token lifetime | Current Desktop acquisition method; distinguish captured tokens from a tested SDK callable hook |
| `references/openai.md` | 110 | Root OpenAI Responses, model in JSON, parameter mapping, text fallback | Current foundation transport and extraction contract |
| `references/gemini.md` | 101 | Native Generate Content routes, empty API version, bearer headers, files and grounding boundary | Current native Gemini transport; grounding still needs separate verification |
| `references/bedrock.md` | 71 | Raw HTTP Converse, model in path, native schema and usage | Current Bedrock transport; no Anthropic native body or SigV4 SDK |

The supplied migration notice was received on 2026-10-23. It sets the final
Desktop migration cutoff to **November 30, 2026**, specifies **50 million
Desktop tokens per month**, and directs extension requests to
`itsai_platform_admin@worldbankgroup.org`. Follow the current platform
documentation under **Desktop Access** for WAM setup. No exact minimum private
SDK release, supported OS list, or OS-specific WAM configuration was supplied.
Do not invent those details or claim that the sources establish a Windows-only
broker configuration.

The notebook export contains credential-like JFrog material and personal data.
None of its literal credentials, personal identifiers, outputs, or source cells
are copied into tracked documentation, examples, or generated public content.
Do not authenticate with those values. If exposure needs action, use the
approved security process without repeating the values.

## Authority and Conflicts

| Topic and source evidence | Decision in the skills |
| --- | --- |
| `mai-factory-builder.agent.md:19-23` treats its embedded examples as authoritative; `mai-factory-builder.md:18-32,90-92` requires current indexed documentation | Treat these documents as source snapshots. Verify current route, schema, environment, headers, SDK/version, and response before invocation code. If unavailable, prepare offline scaffolds and request a non-secret authoritative excerpt |
| PIP environment `:165-200` and R `:121-169` use Azure deployment chat completions; migration `references/openai.md` resolves the target | Use `/maifactory/openai/` as the SDK base with trailing slash and `/maifactory/openai/responses` for raw HTTP. Model is in JSON. Retire `/conversationalai/maifactory` foundation roots; update payload and parsing together |
| New-route guide `:74-107` separates foundation `/maifactory` from `/conversationalai/platform` | Preserve platform prefix. Do not remove `/conversationalai` from every route |
| Older guide Gemini `:88-105,238-278` uses Interactions; migration `references/gemini.md` resolves native generation | Use `/maifactory/gemini/responses/{model}` or `/maifactory/gemini/models/{model}:generateContent` with native `contents`/`parts` and `generationConfig`. For `google-genai`, set `api_version=""`, bearer in both `api_key` and `Authorization`, and rebuild after token refresh. Grounding/Interactions is separate and must be verified |
| Older Bedrock `:582-629` mixes Anthropic native request fields, Converse response, and a variable-name error; migration `references/bedrock.md` resolves transport | Use raw HTTP `/maifactory/bedrock/model/{model_id}/converse`, Converse content and `inferenceConfig`. No `anthropic_version`, typed Anthropic text blocks, or boto3/SigV4 through APIM. Preserve the caller's model and verify residency approval |
| Older batch `:1007-1036` has JSONL `/v1/responses` but create endpoint `/chat/completions` | Require exact endpoint equality, unique `custom_id`, one model per file, unordered result matching, bounded polling, and terminal-failure handling |
| Older guide `:730-738` has standalone Google Search; new-route guide `:106` deprecates it | Route discovery toward verified Gemini grounding; no new standalone-search integration |
| Older Desktop examples use retired `DEV_DESKTOP`, `QA_DESKTOP`, and `PROD_DESKTOP`; migration auth resolves the conflict | Use the approved current private SDK and `DesktopToken().get_token(env="DEV")`, `QA`, or `PROD`. Complete WAM setup from Desktop Access documentation. No device-code, MSAL device flow, or InteractiveBrowserCredential fallback |
| Migration auth examples capture a string; real OpenAI 3.35.1 supports callable `api_key` | Keep an in-memory wrapper that returns the actual `get_token` string per request for the tested SDK. This wrapper is not a `DesktopToken.token_provider` method. Rebuild clients that captured a token string, including Gemini, after refresh at about one hour; raw HTTP reacquires before each request |
| Migration OpenAI reference reports empty top-level `output_text` | Prefer non-empty `output_text`, then extract text from structured `output[].content[].text`. Handle tools, refusals, incomplete states, and no text safely; do not print raw payloads |
| Migration examples show reasoning controls for GPT-5 | Omit `temperature` on GPT-5 models. Use `max_output_tokens` and `reasoning` only when supported by the selected model; do not add reasoning controls to every model |
| Some older app examples omit APIM keys; newer header example `:155-163` adds team name | Use separate bearer and subscription credentials, team attribution, and accurate source type. Verify API-specific requirements |
| R source `:109-117` and onboarding source `:45-51` exempt Connect content OAuth from Desktop onboarding | Preserve a fourth access path. Connect `API_KEY` and `OAUTH_INTEGRATION_GUID` are not mAI keys. Check content integration approval instead |
| R source `:91-107` caches a token in a Shiny reactive without expiry invalidation | Acquire through a provider for each request; do not promise that the old reactive refreshes or share per-user state globally |
| PIP environment `:49-94` stores/prints credential-bearing `UV_INDEX` | Use a credential-free named index, hidden user-entered auth, approved OS stores/Key Vault, and value-free checks. No secret-bearing echo commands |
| PIP prerequisites `:30-46` specify Python up to 3.12; current WAM SDK support matrix is not supplied | Keep Python 3.12 as a historical starter choice, not a claim of current WAM compatibility. Confirm approved SDK/runtime/OS support in Desktop Access docs. Use the actual uv `.venv`, not the inconsistent Windows path |
| PIP prerequisites `:50-55` distinguish US East VPN from DC `bluemarlin` | Preserve the distinction; do not disable VPN/TLS or assume the omitted newer Mac exception was removed |
| Older guide has fixed model names, price examples, token defaults, quota tables, batch retention and TTS SAS details | Treat them as historical examples. Check live catalog, entitlement, schema, costs, retention, and storage policy; do not promise fixed prices or availability |

## Source Coverage Beyond Invocation

The skills retain these operational details from the source set:

- Individual Desktop requests with **Access to mAI Factory** and **Desktop**,
  IFC-specific forms, ACN approval for application promotion, and separate
  Data Lab provisioning.
- Artifactory OpenID OAuth, repository **Set Me Up**, **Pip**, and **Get token &
  Generate Instructions**, with download permissions distinct from deployment.
- JFrog package token versus short-lived model bearer versus APIM subscription
  key versus app secret versus Connect key/integration GUID.
- DEV/QA/PROD hosts and unchanged Application scopes; audit headers; private
  package index; WAM Desktop access; application providers; Connect content OAuth.
- Persistent/shared environment tradeoffs, plaintext profile/env-file risks,
  controlled secret storage and rotation, and unknown SDK-cache internals.
- Responses, tool calls, LangChain, embeddings, Gemini, Bedrock residency,
  asynchronous batch lifecycle, DNR, taxonomy tagging, translation, grounding,
  SSML uploads, private output URLs, and safe support escalation.
- Error triage without full token/claim/HTTP-body logs; quota versus rate
  limits; health versus authentication versus model entitlement.

## Added Engineering Controls

The source files do not supply a portable skill/npm package, credential-store
helper, strict JSONL validator, offline test suite, or CI. These are new work:

- Nine portable `SKILL.md` directories with no cross-skill file dependency.
- npm Git/tarball distribution without install hooks or a registry publication.
- Fail-closed OS credential-store helper; no plaintext fallback.
- Python and R starters with explicit approved endpoint configuration, finite
  timeouts, no default automatic retry, and sanitized errors.
- Offline tests with mock credentials/HTTP boundaries. Test fixtures are not
  actual keys or proof of current mAI access.
- Real OpenAI 3.35.1 SDK tests with its native mock transport check callable
  token refresh, Responses parsing, and blocked 307/308/downgrade redirects.
- Package/content validation and GitHub Actions for repeatable checks.
- Package and website audits reject long literal `token` and `JFROG_TOKEN`
  assignments without printing their values. Synthetic fixtures verify that
  private migration inputs cannot enter the npm package or website reference.

These controls are engineering choices, not statements that the Bank approved
a new authentication method, package license, model deployment, or data policy.

## Migration Verification

- Documentation covers all nine standalone skills, their local references, the
  root README, and the handwritten website guides. Each installed skill keeps
  its required setup and authority rules within its own directory.
- Migration changes authentication and transport only. Keep existing prompts,
  models, report logic, and business behavior unless the user asks otherwise.
- Preserve Application client credentials, scopes and APIM keys, Posit Connect
  content OAuth, and Databricks workspace-managed identity. Preserve health,
  DNR, tagging, translation, and TTS below `/conversationalai/platform`.
- GCS upload helpers below `/maifactory/gemini/gcs/uploads` apply only to an
  existing file-upload workflow. They are not a new default dependency.
- No live credentials, package login, intranet search, or model calls were used
  for this update. Offline checks do not prove native WAM readiness, current
  SDK/OS compatibility, or model entitlements. Complete approved Desktop Access
  setup and a public-sample live smoke test separately.
- Final local verification passed: `npm run validate` validated all nine
  standalone skills; `npm test` passed 21 tests; the isolated Python suite
  passed 29 tests with pinned OpenAI 3.35.1 and mocked HTTP; and
  `Rscript --vanilla tests/test_r_starter.R` passed. Negative R route checks use
  a test-only request boundary so a guard regression cannot make a live call.
- The regenerated website snapshot passed `node site/generate.mjs --check`.
  All eight site tests passed. Both the root preview and `/mAI-skills/` builds
  passed publication, link, fragment, and asset checks. The canonical build has
  37 pages and 44 output files. All 13 handwritten guides passed JSON, ASCII,
  unique-slug, publication-audit, and Markdown-rendering checks.
- All six Playwright tests passed. These check all 37 pages at desktop and
  mobile sizes, horizontal overflow, automated axe accessibility findings,
  keyboard search, focus, menus, and clipboard behavior. No live platform
  authentication or model request is part of these checks.

## Current References

- [mAI documentation](https://ai.worldbank.org/platform/documentation)
- [Model Garden](https://ai.worldbank.org/platform/modelgarden)
- [Current model catalog](https://ai.worldbankgroup.org/maifactory/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Skills CLI installation reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)
- [uv index configuration](https://docs.astral.sh/uv/concepts/indexes/)

Intranet search, when available, should target
`https://worldbankgroup.sharepoint.com/sites/aiwb`, content type `OneCMS_File`,
including `mai-factory-documentation.docx`. No authenticated intranet search
or live mAI request was performed during package development.
