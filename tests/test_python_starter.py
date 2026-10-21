"""Offline tests. No real credential backend, SDK login, or mAI network call."""

import contextlib
import getpass
import importlib.util
import io
import os
from pathlib import Path
import subprocess
import sys
import types
import unittest
import warnings
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


starter = load_module("mai_starter", "skills/mai-python/assets/mai_client.py")
store = load_module("mai_store", "skills/mai-credentials/scripts/store_credentials.py")


class StarterTests(unittest.TestCase):
    def config(self, **changes):
        values = {"MAI_ACCESS_TYPE": "desktop", "MAI_TEAM_NAME": "test-team"}
        values.update(changes)
        return starter.load_config(values)

    def test_environment_scope_and_host_stay_coupled(self):
        for env, (host, scope) in starter.ENVIRONMENTS.items():
            with self.subTest(env=env):
                config = self.config(MAI_ENV=env)
                self.assertEqual(config.host, host)
                self.assertEqual(config.scope, scope)

    def test_invalid_configuration_fails_closed(self):
        for changes in (
            {"MAI_ENV": "UAT"}, {"MAI_ACCESS_TYPE": "databricks"},
            {"MAI_TEAM_NAME": ""}, {"MAI_TEAM_NAME": "team\r\nInjected: value"},
            {"MAI_ACCESS_TYPE": "application"},
        ):
            with self.subTest(changes=changes), self.assertRaises(starter.ConfigurationError):
                self.config(**changes)

    def test_model_route_is_explicit_and_not_required_for_offline_check(self):
        self.assertEqual(self.config().openai_base_url, "")
        for path in ("/maifactory/openai/", "/conversationalai/maifactory/openai/"):
            self.assertEqual(
                self.config(MAI_OPENAI_BASE_URL="https://azapimdev.worldbank.org" + path).openai_base_url,
                "https://azapimdev.worldbank.org" + path,
            )

    def test_untrusted_or_mixed_environment_urls_are_rejected(self):
        for base in (
            "https://api.openai.com/v1/", "http://azapimdev.worldbank.org/maifactory/openai/",
            "https://azapimqa.worldbank.org/maifactory/openai/",
            "https://azapimdev.worldbank.org.evil.invalid/maifactory/openai/",
            "https://user:secret@azapimdev.worldbank.org/maifactory/openai/",
            "https://azapimdev.worldbank.org:443/maifactory/openai/",
            "https://azapimdev.worldbank.org/maifactory/openai/?key=secret",
            "https://azapimdev.worldbank.org/maifactory/openai/#fragment",
            "https://azapimdev.worldbank.org/maifactory/openai/responses",
        ):
            with self.subTest(base=base), self.assertRaises(starter.ConfigurationError):
                self.config(MAI_OPENAI_BASE_URL=base)

    def test_check_never_authenticates_or_reads_store(self):
        env = {"MAI_ACCESS_TYPE": "desktop", "MAI_TEAM_NAME": "test-team"}
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", ["mai_client.py", "check"]), patch.object(starter, "make_token_provider") as provider, patch.object(starter, "secret") as secret, contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(starter.main(), 0)
        provider.assert_not_called()
        secret.assert_not_called()
        self.assertIn("No credentials read", output.getvalue())

    def test_ask_without_verified_route_does_not_start_login(self):
        env = {"MAI_ACCESS_TYPE": "desktop", "MAI_TEAM_NAME": "test-team"}
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", ["mai_client.py", "ask"]), patch.object(starter, "make_token_provider") as provider, contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(starter.main(), 1)
        provider.assert_not_called()

    def test_desktop_provider_uses_selected_sdk_environment_each_time(self):
        credential = Mock()
        credential.get_token.side_effect = ["first-test-token", "second-test-token"]
        sdk = types.SimpleNamespace(DesktopToken=Mock(return_value=credential))
        with patch.dict(sys.modules, {"itsai.platform.authentication": sdk}):
            provider = starter.make_token_provider(self.config(MAI_ENV="QA"))
            self.assertEqual(provider(), "first-test-token")
            self.assertEqual(provider(), "second-test-token")
        self.assertEqual(credential.get_token.call_count, 2)
        credential.get_token.assert_called_with(env="QA_DESKTOP")

    def test_application_provider_and_headers_use_separate_credentials(self):
        env = {"AZURE_TENANT_ID": "test-tenant", "AZURE_CLIENT_ID": "test-client", "AZURE_CLIENT_SECRET": "test-client-secret", "APIM_SUBSCRIPTION_KEY": "test-apim-key"}
        config = self.config(MAI_ACCESS_TYPE="application", **env)
        identity = types.SimpleNamespace(ClientSecretCredential=Mock(), get_bearer_token_provider=Mock())
        with patch.dict(os.environ, env, clear=True), patch.dict(sys.modules, {"azure.identity": identity}):
            starter.make_token_provider(config)
            headers = starter.request_headers(config)
        identity.ClientSecretCredential.assert_called_once_with(tenant_id="test-tenant", client_id="test-client", client_secret="test-client-secret")
        self.assertEqual(identity.get_bearer_token_provider.call_args.args[1], config.scope)
        self.assertEqual(headers["Ocp-Apim-Subscription-Key"], "test-apim-key")
        self.assertEqual(headers["x-source-type"], "job")
        self.assertEqual(headers["x-team-name"], "test-team")

    def test_model_client_keeps_callable_and_limits_output(self):
        client = Mock()
        client.responses.create.return_value.output_text = "test response"
        factory = Mock()
        factory.return_value.__enter__ = Mock(return_value=client)
        factory.return_value.__exit__ = Mock(return_value=False)
        provider = Mock(return_value="test-token")
        config = self.config(MAI_OPENAI_BASE_URL="https://azapimdev.worldbank.org/maifactory/openai/", MAI_MODEL="approved-test-model")
        http_client = Mock()
        with patch.dict(sys.modules, {"openai": types.SimpleNamespace(OpenAI=factory, DefaultHttpxClient=http_client)}):
            self.assertEqual(starter.ask(config, provider, "public sample"), "test response")
        self.assertIs(factory.call_args.kwargs["api_key"], provider)
        self.assertEqual(factory.call_args.kwargs["max_retries"], 0)
        self.assertEqual(factory.call_args.kwargs["timeout"], 30)
        http_client.assert_called_once_with(follow_redirects=False)
        self.assertIs(factory.call_args.kwargs["http_client"], http_client.return_value)
        provider.assert_not_called()
        client.responses.create.assert_called_once_with(model="approved-test-model", input="public sample", max_output_tokens=128)

    def test_health_has_timeout_fresh_auth_and_no_redirect(self):
        requests = types.SimpleNamespace(get=Mock(return_value=types.SimpleNamespace(status_code=200, json=lambda: {"status": "healthy"})))
        provider = Mock(return_value="test-token")
        with patch.dict(sys.modules, {"requests": requests}):
            starter.health(self.config(), provider)
        provider.assert_called_once_with()
        options = requests.get.call_args.kwargs
        self.assertEqual(options["timeout"], 30)
        self.assertIs(options["allow_redirects"], False)
        self.assertEqual(options["headers"]["Authorization"], "Bearer test-token")
        requests.get.return_value.status_code = 302
        with patch.dict(sys.modules, {"requests": requests}), self.assertRaises(starter.ConfigurationError):
            starter.health(self.config(), provider)

    def test_dependency_errors_do_not_leak_exception_body(self):
        env = {"MAI_ACCESS_TYPE": "desktop", "MAI_TEAM_NAME": "test-team"}
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", ["mai_client.py", "health"]), patch.object(starter, "make_token_provider", side_effect=RuntimeError("sensitive-test-value")), contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(starter.main(), 1)
        self.assertNotIn("sensitive-test-value", output.getvalue())


class CredentialStoreTests(unittest.TestCase):
    def test_echo_control_failure_aborts_without_storing_a_secret(self):
        fake_store = Mock()
        def cannot_hide(prompt):
            warnings.warn("Password input may be echoed", getpass.GetPassWarning)
            return "must-not-be-consumed"
        with patch.object(sys, "argv", ["store_credentials.py", "--env", "DEV", "--kind", "application"]), patch.object(sys.stdin, "isatty", return_value=True), patch.object(store, "secure_store", return_value=fake_store), patch.object(store.getpass, "getpass", side_effect=cannot_hide), contextlib.redirect_stderr(io.StringIO()) as output:
            self.assertEqual(store.main(), 1)
        fake_store.set_password.assert_not_called()
        self.assertNotIn("must-not-be-consumed", output.getvalue())

    def test_plaintext_backend_is_rejected_without_read(self):
        backend = type("PlaintextKeyring", (), {"__module__": "keyrings.alt.file"})()
        fake = types.SimpleNamespace(get_keyring=lambda: backend, get_password=Mock())
        with patch.dict(os.environ, {}, clear=True), patch.dict(sys.modules, {"keyring": fake}):
            with self.assertRaises(starter.ConfigurationError):
                starter.secret("AZURE_CLIENT_SECRET", "DEV")
            with self.assertRaises(RuntimeError):
                store.secure_store()
        fake.get_password.assert_not_called()

    def test_os_keyring_service_is_environment_scoped(self):
        backend = type("Keyring", (), {"__module__": "keyring.backends.macOS"})()
        fake = types.SimpleNamespace(get_keyring=lambda: backend, get_password=Mock(return_value="test-value"))
        with patch.dict(os.environ, {}, clear=True), patch.dict(sys.modules, {"keyring": fake}):
            self.assertEqual(starter.secret("APIM_SUBSCRIPTION_KEY", "QA"), "test-value")
        fake.get_password.assert_called_once_with("worldbank-mai/QA", "APIM_SUBSCRIPTION_KEY")

    def test_noninteractive_store_helper_refuses_input(self):
        result = subprocess.run([sys.executable, str(ROOT / "skills/mai-credentials/scripts/store_credentials.py"), "--env", "DEV", "--kind", "application"], input="not-a-secret\n", text=True, capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("interactive terminal", result.stderr)
        self.assertNotIn("not-a-secret", result.stderr)


if __name__ == "__main__":
    unittest.main()
