"""Validate mAI batch JSONL structure offline, without printing request data."""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any


ENDPOINTS = frozenset({"/v1/responses", "/v1/chat/completions"})


class ValidationError(ValueError):
    """A sanitized structural validation error, not an API schema result."""


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ValueError("Non-finite JSON number")


def _finite_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Non-finite JSON number")
    return number


def validate_jsonl(
    path: str | Path, *, endpoint: str, model: str
) -> int:
    """Return the request count or raise a sanitized ValidationError.

    The endpoint and model are caller expectations, not evidence of current
    server support. Provider body schemas and limits are not checked.
    """
    if endpoint not in ENDPOINTS:
        raise ValidationError("Select a supported structural endpoint")
    if not isinstance(model, str) or not model.strip():
        raise ValidationError("Supply a nonblank expected model")

    seen_ids: set[str] = set()
    count = 0
    try:
        with Path(path).open("r", encoding="utf-8") as source:
            for line_number, line in enumerate(source, start=1):
                prefix = f"Line {line_number}: "
                if not line.strip():
                    raise ValidationError(prefix + "blank records are not allowed")
                try:
                    record = json.loads(
                        line,
                        object_pairs_hook=_unique_object,
                        parse_constant=_reject_constant,
                        parse_float=_finite_float,
                    )
                except (ValueError, RecursionError):
                    raise ValidationError(prefix + "invalid strict JSON") from None
                if not isinstance(record, dict):
                    raise ValidationError(prefix + "record must be an object")
                custom_id = record.get("custom_id")
                if not isinstance(custom_id, str) or not custom_id.strip():
                    raise ValidationError(prefix + "custom_id must be a nonblank string")
                if custom_id in seen_ids:
                    raise ValidationError(prefix + "duplicate custom_id")
                if record.get("method") != "POST":
                    raise ValidationError(prefix + "method must be POST")
                if record.get("url") != endpoint:
                    raise ValidationError(prefix + "url must equal the creation endpoint")
                body = record.get("body")
                if not isinstance(body, dict):
                    raise ValidationError(prefix + "body must be an object")
                if body.get("model") != model:
                    raise ValidationError(prefix + "model must equal the expected deployment")
                seen_ids.add(custom_id)
                count += 1
    except (OSError, UnicodeError):
        raise ValidationError("Cannot read input as a UTF-8 JSONL file") from None

    if count == 0:
        raise ValidationError("Input must contain at least one request")
    return count


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Check batch structure offline; this does not verify an API schema."
    )
    parser.add_argument("path", type=Path, help="UTF-8 JSONL input file")
    parser.add_argument("--endpoint", choices=sorted(ENDPOINTS), required=True)
    parser.add_argument("--model", required=True, help="Expected verified deployment name")
    args = parser.parse_args(argv)
    try:
        count = validate_jsonl(args.path, endpoint=args.endpoint, model=args.model)
    except ValidationError as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        return 2
    print(json.dumps({"valid_structure": True, "request_count": count}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
