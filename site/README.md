# Documentation website

The canonical public URL is `https://randrescastaneda.github.io/mAI-skills/`.
The tracked `.openai/hosting.json` preserves the single Sites project used for
owner-private review. Do not enable public Sites access. Repository visibility
and Pages environment protection are managed separately and must be preserved.

## Local development and checks

Use Node.js 22.20.0 or later. The website uses one pinned Markdown build
dependency, browser-test dependencies, and no runtime packages, analytics,
external scripts, remote fonts, or backend. Root package/distribution settings
remain separate from `site/package.json`.

```bash
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix site
node site/generate.mjs
node site/generate.mjs --check
npm test --prefix site
DOCS_BASE_PATH=/mAI-skills/ node site/build.mjs
cd site
npx --no-install playwright install chromium
npx --no-install playwright test
```

`node site/build.mjs` defaults to `/` for a Sites preview. The output is always
`dist/`; it is ignored by Git and excluded from the skill npm package.
`node site/serve.mjs` serves the canonical subpath locally on
`http://127.0.0.1:4173/mAI-skills/`. Stop the process when finished.

The build checks every local link, fragment, asset, duplicate ID, output file
type, and publication input. Browser tests cover every generated page at 1440px
and 390px, axe WCAG A/AA checks, horizontal overflow, skip links, search via
keyboard, focus restoration, mobile menu, and clipboard content. Automated
accessibility checks complement visual and keyboard review; they are not a
certification or a live mAI integration test.

## Color palette

The website uses named colors from the World Bank's
[wbplot palette definitions](https://github.com/worldbank/wbplot/blob/900e68d8b24d9ff0143215e68f42b98c262e825d/data-raw/wb-colors.json),
read alongside its WBCOLORS preparation script and palette documentation.
The source revision is pinned here so later changes can be reviewed deliberately.
This palette adaptation does not imply institutional endorsement; the favicon
and wordmark remain the project's own design.

| Website role | wbplot key | Hex |
| --- | --- | --- |
| Brand, active navigation and hover | corporate | #004972 |
| Primary controls and light-surface focus | selection1 | #0071BC |
| Links and emphasis | cat1Text | #106CA1 |
| Code and terminal backgrounds | seqB5 / total | #023B6F / #163C6C |
| Pale blue surface | seqB1 | #E3F6FD |
| Neutral surfaces and borders | grey100 / grey200 / grey300 | #EBEEF4 / #CED4DE / #8A969F |
| Body and secondary text | text / textSubtle | #111111 / #666666 |
| Bright decorative and dark-surface focus accents | cat1 / seqB2 / cat2 | #34A7F2 / #75CCEC / #FF9800 |
| Text selection and editorial badge | oldestAge / seqY1 | #A1C6FF / #FDF7DB |

White is the neutral canvas. Shadow colors use opacity of the sourced navy.
Bright categorical colors are accents; normal text and controls use darker
palette values. White text on the primary blue has 5.14:1 contrast; normal
body text on white has 18.88:1. The inset code-focus ring has 4.28:1 contrast
against its navy background, and cannot be clipped by the code container.

## Automatic reference versus editorial guides

`public-sources.json` is the explicit reviewed publication allowlist. All nine
`SKILL.md` entry points and every current bundled reference, asset, and helper
are included. `generate.mjs` deterministically derives
`generated/reference.json`, including source contents, metadata, resource
relationships and SHA-256 digests. It rejects new unreviewed resources,
symlinks, sensitive patterns, personal paths and unreviewed email contacts.

After changing a skill, run `node site/generate.mjs` and commit the snapshot.
Pull requests fail if it drifts. Default-branch and release builds generate
from current source again, so direct plugin updates also produce current
reference pages without an automated writeback commit. New skills/resources
require publication review and an allowlist update before they can appear.
Removed resources must be removed from that allowlist.

`guides.json` is handwritten. Its guides cite reviewed source paths. Automation
does not rewrite their prose: maintainers must update affected examples and
guidance when behavior changes. Review them alongside skill changes. The site
labels both content types and links to the exact Git source commit used to
build the page. `build-info.json` records that commit and the reference digest.

## Public-output boundary

Only generated HTML, three maintained browser assets, search data, build
provenance, and `.nojekyll` enter the static output. The build starts from an
empty output directory. It does not copy the repository, `docs/` builder inputs,
`SOURCES.md`, tests, manuscripts, internal notes, environment files, installed
dependencies, Git metadata, hosting identity, logs, or user data. The blank
reviewed `.env.example` appears as escaped reference text only. Support aliases
and environment configuration copied from reviewed skills are intentionally
documented; no private account contact details are included.

Pattern scans supplement the explicit input allowlist and human content review;
they cannot identify every possible secret or confidential sentence. Any new
source needs human review before the allowlist is expanded. Error diagnostics
report categories and file names without echoing detected values. Do not add
real credentials to fixtures. Keep any test output/screenshots outside commits.

## GitHub Actions and Pages

`.github/workflows/documentation.yml` checks pull requests, every push to
`main`, published releases, and manual dispatches. It builds `/` and
`/mAI-skills/`, runs the documentation and root package checks, and verifies
desktop/mobile interactions and accessibility. The existing Validate Skills
workflow continues running the Python and R offline tests independently.
Only the explicit `dist/` output is uploaded to Pages.

PRs cannot deploy. Publication runs after checks on `main`; a release refreshes
documentation from `main`, rather than reverting the site to an older tag.
The deployment job uses the existing `github-pages` environment and its branch
protection, with only `pages: write`, `id-token: write`, and `contents: read`.
The existing environment currently permits `main` only. A release event checks
and rebuilds the latest `main` documentation without attempting a tag deployment;
the current docs deploy on `main` pushes or manual dispatch from `main`. This
avoids weakening the environment allowlist to publish from release tags.

No workflow edits repository visibility, Pages settings, domains, access policy,
branch policies, or Sites sharing. Deployment requires the documentation PR to
be reviewed and merged first. See the
[official custom-workflow contract](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
for Pages permissions, artifacts and environment protection.

## Owner-private Sites review

Build from the final pushed Git commit with `SITE_PREVIEW=1` and the default
root base path. Use the Sites source workflow helper to push that exact commit
to the persisted project's configured source branch and package `dist/`.
Save/deploy through the owner-private native operation. Verify its terminal
success and `get_site` access policy; never use a public audience operation.
The helper's pushed commit must match the GitHub PR head and the build metadata.
Store no write credentials in source, logs, command arguments, or files.

Future private-preview refreshes are deliberate review actions. GitHub Actions
does not hold Sites credentials or change Sites access. GitHub Pages is the
automatic canonical deployment.
