# mAI-skills

Agent skills for World Bank staff who use the mAI Factory with a coding agent.
The collection covers access requests, secure credentials, Python and R starters,
approved APIs, batch processing, Databricks, and troubleshooting.

These skills give an agent instructions. They do not grant mAI access, issue
credentials, or change World Bank security policy. Install them once, then ask
your agent to help with the relevant task.

## Install with npx skills

Requires Git, Node.js **22.20.0 or later**, and npm. Install from the project in
which you use your coding agent:

```bash
npx skills@1.7.4 add randrescastaneda/mAI-skills --list
npx skills@1.7.4 add randrescastaneda/mAI-skills
```

The second command lets you select skills and supported coding agents. To
install all nine skills for one agent without prompts:

```bash
npx skills@1.7.4 add randrescastaneda/mAI-skills --skill '*' --agent claude-code --yes
```

Replace `claude-code` with your agent's supported CLI name, such as `codex`,
`cursor`, `github-copilot`, or `kilo`. Let the CLI show its supported agents if
your agent is not listed. The instructions use the portable `SKILL.md` format;
agent support for automatic skill activation can differ.

Install only the first-connection skills:

```bash
npx skills@1.7.4 add randrescastaneda/mAI-skills --skill mai-factory mai-credentials mai-python
```

Add `--global` to install for your user account across projects. Project-local
installation is the default. Add `--copy` if your system does not permit
symlinks. Each skill includes its own required references and assets; installing
one skill does not require the other eight.

The repository is **public**. No GitHub account, invitation, or access token is
required to download these skills over HTTPS. Do not put credentials in an
installation URL.

mAI Factory services remain restricted. Downloading these skills does not grant
platform access. The relevant onboarding or content-integration approval,
World Bank credentials, and approved network access are still required.

## Install with npm

No npm registry publication is required. Install the skill package directly
from this GitHub repository, then link its bundled skills to your agent:

```bash
npm install --save-dev skills@1.7.4 git+https://github.com/randrescastaneda/mAI-skills.git
npx skills experimental_sync --agent claude-code --yes
```

The explicit HTTPS source supports installation without GitHub authentication
or SSH keys. The package name is `@randrescastaneda/mai-skills`. It has no runtime
dependencies or automatic install scripts. The explicit sync command is
required: `npm install` alone does not activate skills in a coding agent.
`experimental_sync` is an upstream experimental command, pinned here through
`skills@1.7.4`. It reads installed npm dependencies and links their `skills/`
content. Re-run it after updates, especially when using `--copy`.

If sync is not supported by your chosen CLI version, use the stable local-path
installer on the installed package:

```bash
npx skills@1.7.4 add ./node_modules/@randrescastaneda/mai-skills --skill '*' --agent claude-code --yes
```

For a reproducible team setup, commit the consumer project's npm lock file.
Pin the Git dependency to a reviewed commit when required. Do not assume a
GitHub branch name is an immutable release.

For approved internal distribution without GitHub access, a maintainer can
run `npm pack` and share the resulting `.tgz` through an approved channel:

```bash
npm install --save-dev skills@1.7.4 ./randrescastaneda-mai-skills-0.1.0.tgz
npx skills experimental_sync --agent claude-code --yes
```

This requires a trusted copy of the package and access to the npm dependencies
or an approved package cache. It is not a fully offline dependency installer.
The package is marked `private: true` to prevent accidental npm registry
publication. This npm setting does not make the GitHub repository private or
block installation from GitHub or a `.tgz` file. The package has not been
published to the npm registry; use the GitHub command above rather than
`npm install @randrescastaneda/mai-skills`.

Public repository access does not change the applicable redistribution terms;
this project does not grant an open-source license to the supplied source
material.

## Skill Catalog

Browse the [documentation website](https://randrescastaneda.github.io/mAI-skills/)
for installation choices, worked workflows, troubleshooting, and a complete
source-generated reference. See [site/README.md](site/README.md) for the static
build, publication allowlist, drift checks, and protected Pages deployment.

| Skill | Use it for |
| --- | --- |
| [mai-factory](skills/mai-factory/SKILL.md) | Onboarding, access selection, environment matching, first connection |
| [mai-credentials](skills/mai-credentials/SKILL.md) | Key/token types, credential requests, OS stores, Key Vault, rotation |
| [mai-python](skills/mai-python/SKILL.md) | uv/private SDK, Desktop/Application auth, tested Python starter |
| [mai-r](skills/mai-r/SKILL.md) | R authentication, keyring, httr2, ellmer workflow and migration |
| [mai-foundation-models](skills/mai-foundation-models/SKILL.md) | OpenAI, Gemini, Claude/Bedrock, embeddings, LangChain, tool calls |
| [mai-platform-apis](skills/mai-platform-apis/SKILL.md) | Documents & Reports, tagging, translation, grounding, speech |
| [mai-batch](skills/mai-batch/SKILL.md) | JSONL validation, submission lifecycle, result matching and cleanup |
| [mai-databricks](skills/mai-databricks/SKILL.md) | Data Lab provisioning and workspace-managed integration |
| [mai-troubleshooting](skills/mai-troubleshooting/SKILL.md) | Network, auth, permissions, schema errors, quotas, safe escalation |

## First Session

Ask your agent:

> Use mai-factory to help me connect from my local IDE. Start with onboarding
> and confirm which access type I need. Do not request or display secrets.

For Python:

> Use mai-python to create a DEV starter in my project. Use protected
> credentials. Run the offline check first. Verify the current API contract
> before adding a small model call with public sample text.

For R:

> Use mai-r to configure my approved R workflow. Store credentials outside
> the repository. Explain token expiry and check the current API contract.

For a deployed application:

> Use mai-credentials to list my Application Access prerequisites and secure
> runtime settings. Do not ask for the values of any credentials.

The Python starter contains an offline `check`, an authenticated `health`
check, and a small Responses request. The R starter provides matching
configuration, health, and request functions. The batch validator runs offline.
Copy/adapt assets into the user's project; never store project secrets inside
the installed skill package. The agent should inspect existing project files
before making changes.

## Security and Source Rules

- A Desktop bearer token, APIM subscription key, Azure client secret, and JFrog
  download token have different purposes. They are not interchangeable API keys.
- Credentials must not appear in agent chat, tool arguments, source code,
  notebooks, logs, lock files, or Git. Prefer an approved OS store locally and
  Key Vault or the approved secret service in deployed work.
- Users enter secrets themselves through hidden prompts in their own terminal.
  An ignored file is not automatically hidden from a coding agent.
- Use only approved Bank endpoints and data. Do not fall back to a public
  provider, disable TLS, or bypass network/permission controls.
- The supplied sources disagree on some API routes and payloads. The skills
  make these conflicts explicit and require current documentation before
  generating invocation code. They can still prepare and test offline setup.
- Model names, quotas, prices, SDK features, and permissions can change. Check
  the current catalog and documentation. Independently verify AI output.
- The third-party Skills CLI has telemetry and security-audit behavior. Review
  its policy before use. Its documented opt-outs are `DISABLE_TELEMETRY=1` or
  `DO_NOT_TRACK=1`, set in the user's environment.

See [SOURCES.md](SOURCES.md) for the historical source inventory and conflict
decisions. The original source documents are not stored in this repository.

## Updates and Removal

For skills installed directly from Git:

```bash
npx skills@1.7.4 check
npx skills@1.7.4 update
npx skills@1.7.4 remove mai-factory --agent claude-code
```

For npm installation, update the Git dependency with npm, then re-run
`experimental_sync`. Do not expect `skills update` to update an npm package.
Removing a skill does not revoke any issued credential.

## Contribute and Test

```bash
npm ci
npm run validate
npm test
uv run --isolated --no-project --python 3.12 --with-requirements tests/requirements.txt python -m unittest discover -s tests -p 'test_*.py'
Rscript tests/test_r_starter.R
```

The checks validate skill metadata, standalone links, package contents,
credential safety, redirects, token refresh with the real pinned OpenAI SDK,
and offline starter behavior. Python tests need uv and download public test
dependencies; their HTTP transport is mocked. They do not log in to
the Bank, contact mAI, or prove live model access. The R offline tests require
R, not mAI credentials. GitHub Actions runs the automated validation suite.

## Support

- [mAI documentation](https://ai.worldbank.org/platform/documentation)
- [Model Garden](https://ai.worldbank.org/platform/modelgarden)
- [Current models](https://ai.worldbankgroup.org/maifactory/)
- Platform: `itsai_platform_admin@worldbankgroup.org`
- Databricks: `SN-ITSAI-Datascience-Team-Admins@worldbankgroup.org`

IFC must use its specific onboarding process. Databricks uses Data Lab
provisioning. Contact the appropriate team if your approved access path is
not covered by the current documentation.
