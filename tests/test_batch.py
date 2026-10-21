"""Structural batch validation with synthetic data and temporary local files."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("mai_batch", ROOT / "skills/mai-batch/scripts/validate_jsonl.py")
batch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(batch)


class BatchTests(unittest.TestCase):
    def record(self, **changes):
        record = {"custom_id": "test-0", "method": "POST", "url": "/v1/responses", "body": {"model": "approved-test-model", "input": "public sample"}}
        record.update(changes)
        return record

    def validate(self, contents, **changes):
        options = {"endpoint": "/v1/responses", "model": "approved-test-model"}
        options.update(changes)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.jsonl"
            path.write_bytes(contents.encode() if isinstance(contents, str) else contents)
            return batch.validate_jsonl(path, **options)

    def test_valid_requests_count_and_endpoint_families(self):
        self.assertEqual(self.validate(json.dumps(self.record())), 1)
        chat = self.record(url="/v1/chat/completions", body={"model": "approved-test-model", "messages": []})
        self.assertEqual(self.validate(json.dumps(chat), endpoint="/v1/chat/completions"), 1)

    def test_results_do_not_depend_on_input_order(self):
        contents = "\n".join(json.dumps(self.record(custom_id=name)) for name in ("test-z", "test-a")) + "\n"
        self.assertEqual(self.validate(contents), 2)

    def test_invalid_record_envelopes_are_rejected(self):
        for record in (
            [], None, "text", self.record(custom_id=""), self.record(custom_id=3),
            self.record(method="GET"), self.record(url="/chat/completions"),
            self.record(url="/v1/chat/completions"), self.record(body=[]),
            self.record(body={"model": "different-model"}),
        ):
            with self.subTest(record=record), self.assertRaises(batch.ValidationError):
                self.validate(json.dumps(record))

    def test_duplicate_custom_ids_are_rejected(self):
        contents = json.dumps(self.record()) + "\n" + json.dumps(self.record())
        with self.assertRaisesRegex(batch.ValidationError, "Line 2: duplicate custom_id"):
            self.validate(contents)

    def test_strict_json_empty_blank_and_encoding_failures(self):
        for contents in (
            "", "\n", "{not-json}", "{\"body\":NaN}",
            "{\"a\":1,\"a\":2}", "{\"a\":1e1000}", b"\xff",
            json.dumps(self.record()) + "\n\n",
        ):
            with self.subTest(contents=contents), self.assertRaises(batch.ValidationError):
                self.validate(contents)

    def test_error_messages_do_not_echo_input_or_paths(self):
        with self.assertRaises(batch.ValidationError) as raised:
            self.validate('{"private-test-content":invalid}')
        self.assertNotIn("private-test-content", str(raised.exception))
        with self.assertRaises(batch.ValidationError) as raised:
            batch.validate_jsonl("/nonexistent/private-test-path", endpoint="/v1/responses", model="test")
        self.assertNotIn("private-test-path", str(raised.exception))

    def test_expectations_are_not_inferred_from_the_file(self):
        with self.assertRaises(batch.ValidationError):
            self.validate(json.dumps(self.record()), endpoint="/responses")
        with self.assertRaises(batch.ValidationError):
            self.validate(json.dumps(self.record()), model=" ")

    def test_cli_reports_count_without_request_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.jsonl"
            path.write_text(json.dumps(self.record()))
            with contextlib.redirect_stdout(io.StringIO()) as output:
                result = batch.main([str(path), "--endpoint", "/v1/responses", "--model", "approved-test-model"])
            self.assertEqual(result, 0)
            self.assertEqual(json.loads(output.getvalue()), {"valid_structure": True, "request_count": 1})
            self.assertNotIn("public sample", output.getvalue())
            path.write_text("invalid-private-test-content")
            with contextlib.redirect_stderr(io.StringIO()) as output:
                result = batch.main([str(path), "--endpoint", "/v1/responses", "--model", "approved-test-model"])
            self.assertEqual(result, 2)
            self.assertNotIn("private-test-content", output.getvalue())


if __name__ == "__main__":
    unittest.main()
