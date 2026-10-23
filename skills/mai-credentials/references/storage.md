# Storage, Deployment, and Rotation

## Local Storage

Use Windows Credential Manager, macOS Keychain, or the approved Linux secret
service. Python `keyring` and R `keyring` are clients for these stores; their
backend must be secure and available. Do not install a plaintext fallback.
Do not assume Python and R use identical account/service formats.

Do not ask an agent to read a user's credential store. Have the user run a
hidden-input setup command themselves. A credential should not appear in a
tool argument, chat message, shell command, or environment diagnostic.

If an approved local environment file is necessary:

1. Put it outside source control and cloud-synced folders where possible.
2. Add `.env`, `.env.*`, and `.Renviron` to `.gitignore` before use. Keep only
   blank templates such as `.env.example` tracked. Ignore rules do not untrack
   a file already committed. Check tracked file names without showing contents.
3. Use a user-only directory and permissions (`chmod 600` on POSIX; user-only
   NTFS ACLs on Windows). A permission command does not encrypt the file.
4. Edit secrets manually in a trusted local editor. Do not pass them as command
   arguments or write them through the coding agent. Exclude secret files from
   agent context/indexing with the agent's supported controls. `.gitignore`
   alone does not prevent an agent from reading a file.
5. Load the file explicitly in the intended process. A file named `.env` does
   not load automatically in Python. Never log the parsed settings.
6. Delete temporary bearer tokens after use, and refresh through the approved
   provider. Persistent app secrets and APIM keys need controlled rotation.

Prefer OS stores instead of teaching an agent to load `.env` files.

OS storage is not a replacement for Desktop WAM authentication. The current
default is `DesktopToken().get_token(env="DEV")` with the approved private SDK,
not a bearer copied to an environment variable or keyring. Keep Desktop tokens
in memory. Rebuild clients that captured a token string after refresh, at about
one hour; a tested SDK callable can acquire through the provider per request.
Never manipulate an undocumented Desktop token cache or add a device-code
fallback when WAM setup fails. Use current **Desktop Access** documentation and
platform support instead.

## Deployed Applications

Use Azure Key Vault or the approved runtime's secret service. The supplied
guide shows `SecretClient` with `DefaultAzureCredential` to read secrets. This
authenticates to Key Vault; it does not prove that the same identity is entitled
to call mAI. The mAI app registration and subscription are a separate approval.

```python
import os
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

vault = SecretClient(
    vault_url=os.environ["KEY_VAULT_URL"],
    credential=DefaultAzureCredential(),
)
# Use the organization's approved secret names, not guessed vault objects.
client_secret = vault.get_secret(os.environ["MAI_CLIENT_SECRET_NAME"]).value
apim_key = vault.get_secret(os.environ["MAI_APIM_KEY_NAME"]).value
```

Use an approved, least-privilege runtime identity for the vault. Grant access
only to required secrets. Do not add a production dependency on a developer's
local credential store or interactive login. Never save retrieved vault values
back to disk or print the SecretClient response.

## Rotation

1. Identify the owner, environment, expiry, and affected applications without
   exposing values. Keep an inventory of secret names, not secret contents.
2. Request a new credential through the approved app/platform owner.
3. Update the approved store, restart/reload clients as required, and test a
   small request. Cached clients can retain the old subscription key.
4. Revoke the old credential under the approved change process.
5. If exposure occurred, revoke promptly, notify the proper security channel,
   and review logs. Coordinate repository history cleanup separately; never
   force-push or rewrite shared history without authorization.
