# Source Inventory and Decisions

Reviewed on 2026-10-21. This is a record of the historical source documents used
to build the skills, not a claim that live mAI endpoints were verified.
All implementation work is in `mAI-skills`; no source project was changed.

## Complete Inventory

The source project is `GPID/Pip-Technical-Guidelines` in the local project
collection, with upstream [GPID-WB/Pip-Technical-Guidelines](https://github.com/GPID-WB/Pip-Technical-Guidelines).
A recursive search found exactly four `mAI*.qmd` files, all at its root.
All four files and both builder guides listed below were read in full.

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

The two builder guides are historical inputs and are not stored in this
repository. The derived skills do not repeat their entire text or make a new
license claim about Bank documentation.

## Authority and Conflicts

| Topic and source evidence | Decision in the skills |
| --- | --- |
| `mai-factory-builder.agent.md:19-23` treats its embedded examples as authoritative; `mai-factory-builder.md:18-32,90-92` requires current indexed documentation | Treat these documents as source snapshots. Verify current route, schema, environment, headers, SDK/version, and response before invocation code. If unavailable, prepare offline scaffolds and request a non-secret authoritative excerpt |
| PIP environment `:165-200` and R `:121-169` use Azure deployment chat completions; builder guides list different Responses roots | Do not mix Azure chat payloads, Responses parsing, and different route roots. Require explicit verified SDK base/full R URL |
| New-route guide `:74-107` separates foundation `/maifactory` from `/conversationalai/platform` | Preserve platform prefix. Do not remove `/conversationalai` from every route |
| Older guide Gemini `:88-105,238-278` uses Interactions; new-route guide `:99` lists Generate Content | Do not present Interactions as the universal current API; verify native contract and SDK before use |
| Older Bedrock `:582-629` mixes Anthropic native request fields, Converse response, and a variable-name error | Explain separate protocols; require verified schema and US-region approved model IDs |
| Older batch `:1007-1036` has JSONL `/v1/responses` but create endpoint `/chat/completions` | Require exact endpoint equality, unique `custom_id`, one model per file, unordered result matching, bounded polling, and terminal-failure handling |
| Older guide `:730-738` has standalone Google Search; new-route guide `:106` deprecates it | Route discovery toward verified Gemini grounding; no new standalone-search integration |
| New guide checklist `:166-171` says `DEV`, but its code `:139-142` and PIP environment `:293-298` use `DEV_DESKTOP` | Use the code-supported Desktop SDK names and require installed-version confirmation |
| Older OpenAI example `:476-495` evaluates the provider but says it passes a callable | Pass `api_key=token_provider` to supported SDKs; raw HTTP reacquires per request |
| Some older app examples omit APIM keys; newer header example `:155-163` adds team name | Use separate bearer and subscription credentials, team attribution, and accurate source type. Verify API-specific requirements |
| R source `:109-117` and onboarding source `:45-51` exempt Connect content OAuth from Desktop onboarding | Preserve a fourth access path. Connect `API_KEY` and `OAUTH_INTEGRATION_GUID` are not mAI keys. Check content integration approval instead |
| R source `:91-107` caches a token in a Shiny reactive without expiry invalidation | Acquire through a provider for each request; do not promise that the old reactive refreshes or share per-user state globally |
| PIP environment `:49-94` stores/prints credential-bearing `UV_INDEX` | Use a credential-free named index, hidden user-entered auth, approved OS stores/Key Vault, and value-free checks. No secret-bearing echo commands |
| PIP prerequisites `:30-46` specify Python up to 3.12; environment `:122-136` has inconsistent activation paths | Recommend Python 3.12 for the private SDK until current compatibility is confirmed. Use the actual uv `.venv`, not the inconsistent Windows path |
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
- DEV/QA/PROD hosts and scopes; audit headers; private package index; browser
  Desktop login; application credential-provider flow; Connect content OAuth.
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

These controls are engineering choices, not statements that the Bank approved
a new authentication method, package license, model deployment, or data policy.

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
