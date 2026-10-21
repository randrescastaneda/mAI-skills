"""Store credentials from a user's terminal without displaying their values."""

import argparse
import getpass
import sys
import warnings


KINDS = {
    "application": ("AZURE_CLIENT_SECRET", "APIM_SUBSCRIPTION_KEY"),
    "jfrog": ("JFROG_TOKEN",),
    "bearer": ("MAI_BEARER_TOKEN",),
}
SECURE_BACKENDS = (
    "keyring.backends.Windows",
    "keyring.backends.macOS",
    "keyring.backends.SecretService",
    "keyring.backends.kwallet",
)


def secure_store():
    import keyring

    backend = keyring.get_keyring()
    module = type(backend).__module__
    if not any(module == prefix or module.startswith(prefix + ".") for prefix in SECURE_BACKENDS):
        raise RuntimeError("An approved OS keyring backend is required; no file fallback is used.")
    return keyring


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", choices=("DEV", "QA", "PROD"), required=True)
    parser.add_argument("--kind", choices=KINDS, required=True)
    parser.add_argument("--delete", action="store_true")
    args = parser.parse_args()
    if not sys.stdin.isatty():
        parser.error("Run this helper yourself in an interactive terminal, not through an agent.")
    service = f"worldbank-mai/{args.env}"
    try:
        store = secure_store()
        for name in KINDS[args.kind]:
            if args.delete:
                if store.get_password(service, name) is not None:
                    store.delete_password(service, name)
            else:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", getpass.GetPassWarning)
                    value = getpass.getpass(f"Enter {name} for {args.env} (hidden): ")
                if not value.strip():
                    raise ValueError("Empty credentials are not stored.")
                store.set_password(service, name, value)
        sys.stdout.write("Credential store updated. No values were displayed.\n")
        return 0
    except Exception:
        sys.stderr.write("Credential store operation failed. Check the approved OS backend locally.\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
