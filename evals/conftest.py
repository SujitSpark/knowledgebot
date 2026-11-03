import json
import time
from collections import defaultdict
from pathlib import Path

import pytest

from kb_client import KnowledgeBotClient

HERE = Path(__file__).resolve().parent
DATASET = json.loads((HERE / "golden_dataset.json").read_text(encoding="utf-8"))["cases"]
RESULTS_DIR = HERE / "results"

# metric name -> list of (case_id, passed, detail)
RECORDS: dict[str, list] = defaultdict(list)
RUNS: dict[str, dict] = {}


def cases(kind: str):
    return [pytest.param(c, id=c["id"]) for c in DATASET if c["type"] == kind]


@pytest.fixture(scope="session")
def kb():
    client = KnowledgeBotClient()
    yield client
    client.close()


@pytest.fixture(scope="session")
def run(kb):
    """Ask each question once per test session and reuse the answer across metrics."""

    def _run(case: dict) -> dict:
        if case["id"] not in RUNS:
            result = kb.ask(case["question"])
            result["context"] = kb.retrieve(case["question"])
            RUNS[case["id"]] = result
        return RUNS[case["id"]]

    return _run


def record(metric: str, case_id: str, passed: bool, detail=None):
    RECORDS[metric].append({"case": case_id, "passed": bool(passed), "detail": detail})


def pytest_sessionfinish(session, exitstatus):
    if not RECORDS:
        return
    RESULTS_DIR.mkdir(exist_ok=True)
    latencies = [r["latency_s"] for r in RUNS.values()]
    summary = {
        name: {
            "passed": sum(r["passed"] for r in rows),
            "total": len(rows),
            "rate": round(sum(r["passed"] for r in rows) / len(rows), 3),
        }
        for name, rows in RECORDS.items()
    }
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "summary": summary,
        "latency_s": {
            "mean": round(sum(latencies) / len(latencies), 2) if latencies else None,
            "max": round(max(latencies), 2) if latencies else None,
        },
        "records": RECORDS,
        "answers": {k: {"answer": v["answer"], "latency_s": round(v["latency_s"], 2)} for k, v in RUNS.items()},
    }
    (RESULTS_DIR / "latest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
