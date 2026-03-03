import type { FunctionHarnessCase } from '../../data/functionModeTemplates'

type BuildPythonHarnessInput = {
  userCode: string
  methodName: string
  cases: FunctionHarnessCase[]
}

export function buildPythonHarness({
  userCode,
  methodName,
  cases,
}: BuildPythonHarnessInput) {
  const encodedCases = JSON.stringify(cases)

  return `from __future__ import annotations

import json
from typing import Any

${userCode}

_CASES = json.loads(${JSON.stringify(encodedCases)})
_METHOD = ${JSON.stringify(methodName)}

def _normalize(value: Any):
    if value is None:
        return ""
    if isinstance(value, tuple):
        return [_normalize(x) for x in value]
    if isinstance(value, list):
        return [_normalize(x) for x in value]
    if isinstance(value, dict):
        return {str(k): _normalize(v) for k, v in value.items()}
    return value

def _stringify(value: Any):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    try:
        return json.dumps(_normalize(value))
    except Exception:
        return str(value)

_results = []
for _case in _CASES:
    _item = {
        "input": _case.get("input", ""),
        "expected": _case.get("expectedText", ""),
        "actual": "",
        "stderr": "",
        "passed": False,
    }
    try:
        _solver = Solution()
        _fn = getattr(_solver, _METHOD)
        _actual = _fn(*_case.get("args", []))
        _item["actual"] = _stringify(_actual)
        _item["passed"] = _normalize(_actual) == _case.get("expectedValue")
    except Exception as _exc:
        _item["stderr"] = f"{_exc.__class__.__name__}: {_exc}"
    _results.append(_item)

print(json.dumps({"harness": "function", "cases": _results}, ensure_ascii=False))
`
}
