"""Real SDK tests with a mock transport. No network, login, or real secrets."""

import os
import unittest
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


if __name__ == "__main__":
    unittest.main()
