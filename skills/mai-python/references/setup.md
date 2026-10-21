# Private Index and Credential Setup

The source guides install `itsai-platform` from the Bank Artifactory virtual
index. A JFrog token is a package-download credential, not a model API key.
Get it through the approved Bank Artifactory process. If the account/token
creation steps are not available, ask platform support; do not invent them.

The PIP source steps are: sign in at
`https://artifactory.worldbank.org/ui/login` through OpenID OAuth; open
`itsdt-pypi-virtual/itsai-platform`; select **Set Me Up**; change **Poetry** to
**Pip**; then select **Get token & Generate Instructions**. A "no deploy
permissions" notice does not block downloads. Stop and ask support if the
current portal differs. Never display or paste the generated token into chat.

The bundled TOML uses uv's named index `itsai` with `explicit = true`, scoped
to `itsai-platform`. Merge it into an existing project without duplicating
TOML tables. The URL must remain free of credentials. Run `uv lock` and inspect
only non-secret changes before committing.

For a named uv index, authentication variables are
`UV_INDEX_ITSAI_USERNAME` and `UV_INDEX_ITSAI_PASSWORD`. Prefer the approved
uv credential store or credential-provider integration for the installed uv
version. If environment injection is required, the user can set values from
hidden prompts in their own terminal. Never ask the coding agent to supply
or capture the values. Do not place literal values in shell history.

POSIX shell, run by the user, not the agent:

```bash
read -r -p "JFrog username: " UV_INDEX_ITSAI_USERNAME
read -r -s -p "JFrog token (hidden): " UV_INDEX_ITSAI_PASSWORD
export UV_INDEX_ITSAI_USERNAME UV_INDEX_ITSAI_PASSWORD
uv add itsai-platform
unset UV_INDEX_ITSAI_USERNAME UV_INDEX_ITSAI_PASSWORD
```

The `read -p/-s` syntax above is for Bash. Do not run it unchanged in zsh;
use zsh's hidden-input syntax or the approved credential-store integration.

PowerShell 7, also run only by the user:

```powershell
$env:UV_INDEX_ITSAI_USERNAME = Read-Host "JFrog username"
$env:UV_INDEX_ITSAI_PASSWORD = Read-Host "JFrog token (hidden)" -MaskInput
uv add itsai-platform
Remove-Item Env:UV_INDEX_ITSAI_USERNAME, Env:UV_INDEX_ITSAI_PASSWORD
```

Do not persist these variables in user profiles or `.env`. Close the terminal
after use. Environment values remain accessible to that user's processes;
use an approved credential provider when available.

Desktop authentication then uses:

```python
from itsai.platform.authentication import DesktopToken

credential = DesktopToken()
def token_provider() -> str:
    return credential.get_token(env="DEV_DESKTOP")
```

Keep the provider in memory. Do not display the returned token, decode it in
an online JWT site, or store it as a permanent API key. SDK environment names
must match the installed SDK documentation.

Application Access requires `azure-identity`, approved app credentials, APIM
key, and an environment-matched scope. `get_bearer_token_provider` refreshes
tokens; it does not grant missing app permissions or network access.
