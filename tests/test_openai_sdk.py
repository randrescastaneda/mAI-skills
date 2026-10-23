"""Real SDK tests with a mock transport. No network, login, or real secrets."""

import json
import os
import sys
import types
import unittest
import warnings
from unittest.mock import Mock, patch

import httpx2 as httpx
import openai

from test_python_starter import starter


class OpenAISecurityTests(unittest.TestCase):
    def setUp(self):
        self.environment = {
            "MAI_ACCESS_TYPE": "application", "MAI_TEAM_NAME": "test-team",
            "MAI_OPENAI_BASE_URL": "https://azapimdev.worldbank.org/maifactory/openai/",
            "MAI_MODEL": "approved-test-model", "AZURE_CLIENT_ID": "test-client",
            "AZURE_TENANT_ID": "test-tenant", "APIM_SUBSCRIPTION_KEY": "test-apim-key",
        }
        self.config = starter.load_config(self.environment)

    def test_redirects_never_forward_credentials_or_body(self):
        client_class = openai.DefaultHttpxClient
        for status in (307, 308):
            for target in ("https://redirect.example.invalid/collect", "http://azapimdev.worldbank.org/collect"):
                seen = []
                def redirect(request):
                    seen.append(request)
                    return httpx.Response(status, headers={"Location": target})
                def http_client(**options):
                    return client_class(transport=httpx.MockTransport(redirect), **options)
                with self.subTest(status=status, target=target), patch.dict(os.environ, self.environment, clear=True), patch.object(openai, "DefaultHttpxClient", side_effect=http_client):
                    with self.assertRaises(openai.APIStatusError):
                        starter.ask(self.config, lambda: "test-token", "public sample")
                self.assertEqual(len(seen), 1, "A redirect must not trigger a second request")
                self.assertEqual(seen[0].url.host, "azapimdev.worldbank.org")

    def test_actual_sdk_refreshes_callable_and_parses_responses(self):
        seen = []
        def respond(request):
            seen.append(request)
            return httpx.Response(200, json={
                "id": "resp_test", "object": "response", "created_at": 0,
                "status": "completed", "model": "approved-test-model",
                "output": [{"type": "message", "role": "assistant", "content": [
                    {"type": "output_text", "text": "test response", "annotations": []}
                ]}],
            })
        provider = Mock(side_effect=["test-token-one", "test-token-two"])
        with openai.OpenAI(
            base_url=self.config.openai_base_url, api_key=provider, max_retries=0,
            http_client=openai.DefaultHttpxClient(follow_redirects=False, transport=httpx.MockTransport(respond)),
        ) as client:
            first = client.responses.create(model=self.config.model, input="public sample")
            second = client.responses.create(model=self.config.model, input="public sample")
        self.assertEqual(first.output_text, "test response")
        self.assertEqual(second.output_text, "test response")
        self.assertEqual([request.headers["authorization"] for request in seen], ["Bearer test-token-one", "Bearer test-token-two"])
        self.assertTrue(all(request.url.path == "/maifactory/openai/responses" for request in seen))

    def test_desktop_starter_uses_wam_contract_and_gateway_text_fallback(self):
        client_class = openai.DefaultHttpxClient
        for env, (host, _) in starter.ENVIRONMENTS.items():
            seen = []
            def respond(request):
                seen.append(request)
                return httpx.Response(200, json={
                    "id": "resp_test", "object": "response", "created_at": 0,
                    "status": "completed", "model": "approved-test-model",
                    "output_text": "",
                    "output": [
                        {"type": "reasoning", "id": "reason_test", "summary": []},
                        {"type": "message", "role": "assistant", "content": [
                            {"type": "text", "text": "pong"}
                        ]},
                    ],
                })
            def http_client(**options):
                return client_class(transport=httpx.MockTransport(respond), **options)
            credential = Mock()
            credential.get_token.side_effect = ["test-token-one", "test-token-two"]
            sdk = types.SimpleNamespace(DesktopToken=Mock(return_value=credential))
            values = {
                "MAI_ENV": env, "MAI_ACCESS_TYPE": "desktop", "MAI_TEAM_NAME": "test-team",
                "MAI_OPENAI_BASE_URL": f"https://{host}/maifactory/openai/", "MAI_MODEL": "approved-test-model",
            }
            with self.subTest(env=env), patch.dict(os.environ, values, clear=True), patch.dict(sys.modules, {"itsai.platform.authentication": sdk}), patch.object(openai, "DefaultHttpxClient", side_effect=http_client), warnings.catch_warnings():
                warnings.simplefilter("error")
                config = starter.load_config()
                provider = starter.make_token_provider(config)
                self.assertEqual(starter.ask(config, provider, "Reply with the single word: pong"), "pong")
                self.assertEqual(starter.ask(config, provider, "Reply with the single word: pong"), "pong")
            self.assertEqual(credential.get_token.call_count, 2)
            credential.get_token.assert_called_with(env=env)
            self.assertEqual([request.headers["authorization"] for request in seen], ["Bearer test-token-one", "Bearer test-token-two"])
            for request in seen:
                self.assertEqual(str(request.url), f"https://{host}/maifactory/openai/responses")
                self.assertEqual(request.headers["x-source-type"], "interactive")
                self.assertEqual(request.headers["x-team-name"], "test-team")
                self.assertNotIn("ocp-apim-subscription-key", request.headers)
                self.assertEqual(json.loads(request.content), {
                    "model": "approved-test-model", "input": "Reply with the single word: pong", "max_output_tokens": 128,
                })


if __name__ == "__main__":
    unittest.main()
