"""Small, explicit mAI starter. Import and `check` are offline and secret-free."""

import argparse
from dataclasses import dataclass
import os
import sys
from collections.abc import Callable, Mapping
from urllib.parse import urlsplit


ENVIRONMENTS = {
    "DEV": ("azapimdev.worldbank.org", "a1dd6401-acf2-43b5-a37c-c3230ef1be7d/.default"),
    "QA": ("azapimqa.worldbank.org", "c626bd72-9ef7-4efe-9176-5c75800f7670/.default"),
    "PROD": ("azapim.worldbank.org", "0b3b356c-4b5f-4d5b-97ad-c99343ad5557/.default"),
}


class ConfigurationError(ValueError):
    """A safe diagnostic which never includes configuration values."""


@dataclass(frozen=True)
class Config:
    environment: str
    access_type: str
    team_name: str
    host: str
    scope: str
    openai_base_url: str
    model: str


def load_config(environ: Mapping[str, str] | None = None) -> Config:
    values = os.environ if environ is None else environ
    environment = values.get("MAI_ENV", "DEV").strip().upper()
    if environment not in ENVIRONMENTS:
        raise ConfigurationError("MAI_ENV must be DEV, QA, or PROD.")
    access = values.get("MAI_ACCESS_TYPE", "").strip().lower()
    if access not in {"desktop", "application"}:
        raise ConfigurationError("Set MAI_ACCESS_TYPE to desktop or application.")
    team = values.get("MAI_TEAM_NAME", "").strip()
    if not team or any(ord(char) < 32 or ord(char) > 126 for char in team):
        raise ConfigurationError("Set MAI_TEAM_NAME to an approved ASCII header value.")
    host, scope = ENVIRONMENTS[environment]
    base = values.get("MAI_OPENAI_BASE_URL", "").strip()
    if base:
        url = urlsplit(base)
        if (
            url.scheme != "https"
            or url.netloc != host
            or url.query
            or url.fragment
            or url.path != "/maifactory/openai/"
        ):
            raise ConfigurationError("Use /maifactory/openai/ on the matching mAI host; retired model routes are not supported.")
    if access == "application":
        for name in ("AZURE_TENANT_ID", "AZURE_CLIENT_ID"):
            if not values.get(name, "").strip():
                raise ConfigurationError(f"Set {name} from the approved app registration.")
    return Config(environment, access, team, host, scope, base, values.get("MAI_MODEL", "").strip())


def secret(name: str, environment: str) -> str:
    value = os.environ.get(name, "")
    if value.strip():
        return value
    import keyring

    module = type(keyring.get_keyring()).__module__
    allowed = ("keyring.backends.Windows", "keyring.backends.macOS", "keyring.backends.SecretService", "keyring.backends.kwallet")
    if not any(module == item or module.startswith(item + ".") for item in allowed):
        raise ConfigurationError("An approved OS credential store or injected secret is required.")
    value = keyring.get_password(f"worldbank-mai/{environment}", name)
    if not value or not value.strip():
        raise ConfigurationError(f"Provision {name} in the approved credential store.")
    return value


def make_token_provider(config: Config) -> Callable[[], str]:
    if config.access_type == "desktop":
        from itsai.platform.authentication import DesktopToken

        credential = DesktopToken()
        return lambda: credential.get_token(env=config.environment)
    from azure.identity import ClientSecretCredential, get_bearer_token_provider

    credential = ClientSecretCredential(
        tenant_id=os.environ["AZURE_TENANT_ID"],
        client_id=os.environ["AZURE_CLIENT_ID"],
        client_secret=secret("AZURE_CLIENT_SECRET", config.environment),
    )
    return get_bearer_token_provider(credential, config.scope)


def request_headers(config: Config) -> dict[str, str]:
    headers = {
        "x-team-name": config.team_name,
        "x-source-type": "interactive" if config.access_type == "desktop" else "job",
    }
    if config.access_type == "application":
        headers["Ocp-Apim-Subscription-Key"] = secret("APIM_SUBSCRIPTION_KEY", config.environment)
    return headers


def health(config: Config, provider: Callable[[], str]) -> None:
    import requests

    headers = request_headers(config)
    headers["Authorization"] = f"Bearer {provider()}"
    response = requests.get(
        f"https://{config.host}/conversationalai/platform/health/",
        headers=headers, timeout=30, allow_redirects=False,
    )
    if response.status_code != 200:
        raise ConfigurationError(f"Health request returned HTTP {response.status_code}; inspect locally without sharing credentials.")
    if response.json().get("status") != "healthy":
        raise ConfigurationError("Health response did not confirm healthy status.")


def ask(config: Config, provider: Callable[[], str], prompt: str) -> str:
    if not config.openai_base_url or not config.model:
        raise ConfigurationError("Verify and set MAI_OPENAI_BASE_URL and MAI_MODEL before a model call.")
    from openai import DefaultHttpxClient, OpenAI

    with OpenAI(
        base_url=config.openai_base_url,
        api_key=provider,
        default_headers=request_headers(config),
        timeout=30,
        max_retries=0,
        http_client=DefaultHttpxClient(follow_redirects=False),
    ) as client:
        response = client.responses.create(model=config.model, input=prompt, max_output_tokens=128)
    if isinstance(response.output_text, str) and response.output_text.strip():
        return response.output_text
    # Some gateway responses omit the SDK convenience text but retain text blocks.
    # Schema warnings can include response data, so do not emit them.
    parts = []
    for item in response.model_dump(warnings=False).get("output") or []:
        if not isinstance(item, dict):
            continue
        if (
            item.get("type") in {"output_text", "text", None}
            and isinstance(item.get("text"), str) and item["text"].strip()
        ):
            parts.append(item["text"])
        if item.get("type") in {"message", None}:
            for block in item.get("content") or []:
                if (
                    isinstance(block, dict) and block.get("type") in {"output_text", "text"}
                    and isinstance(block.get("text"), str) and block["text"].strip()
                ):
                    parts.append(block["text"])
    if not parts:
        raise ConfigurationError("No Responses text returned; check response status and the approved model contract locally.")
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("check", "health", "ask"))
    parser.add_argument("--prompt", default="Explain the World Bank mission in one sentence.")
    args = parser.parse_args()
    try:
        config = load_config()
        if args.command == "check":
            sys.stdout.write("Configuration valid. No credentials read and no network request made.\n")
        elif args.command == "health":
            health(config, make_token_provider(config))
            sys.stdout.write("Gateway healthy. Model permissions are not yet verified.\n")
        else:
            if not config.openai_base_url or not config.model:
                raise ConfigurationError("Verify and set MAI_OPENAI_BASE_URL and MAI_MODEL before login.")
            sys.stdout.write(ask(config, make_token_provider(config), args.prompt) + "\n")
        return 0
    except ConfigurationError as error:
        sys.stderr.write(str(error) + "\n")
    except Exception as error:
        status = getattr(error, "status_code", None)
        suffix = f" (HTTP {status})" if isinstance(status, int) else ""
        sys.stderr.write(f"mAI operation failed{suffix}. Check dependencies, access, and environment locally; no error body was logged.\n")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
