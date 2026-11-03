"""Quality evals for answerable questions: retrieval, correctness, citations,
and LLM-judged faithfulness / relevancy (DeepEval with a local Ollama judge)."""
import os

import pytest
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

from conftest import cases, record
from judge import OllamaJudge
from kb_client import OLLAMA_URL, REFUSAL

JUDGE = OllamaJudge(model=os.getenv("EVAL_JUDGE_MODEL", "qwen3:4b"), base_url=OLLAMA_URL)
THRESHOLD = float(os.getenv("EVAL_THRESHOLD", "0.7"))


def strip_citation(answer: str) -> str:
    return answer.split("\n\nSource:")[0].strip()


@pytest.mark.parametrize("case", cases("answerable"))
def test_retrieval_hit_at_5(case, run):
    """The expected document must be among the top-5 chunks and contain the key fact."""
    ctx = run(case)["context"]
    source_hit = any(c["source"] == case["expected_source"] for c in ctx)
    fact_hit = any(k.lower() in c["content"].lower() for c in ctx for k in case["must_contain_any"])
    record("retrieval_hit@5", case["id"], source_hit and fact_hit, [c["source"] for c in ctx])
    assert source_hit and fact_hit


@pytest.mark.parametrize("case", cases("answerable"))
def test_answer_correctness(case, run):
    """Answerable questions must not be refused and must state the key fact."""
    answer = run(case)["answer"]
    ok = REFUSAL not in answer and any(k.lower() in answer.lower() for k in case["must_contain_any"])
    record("answer_correctness", case["id"], ok, answer[:200])
    assert ok, answer


@pytest.mark.parametrize("case", cases("answerable"))
def test_source_citation(case, run):
    answer = run(case)["answer"]
    ok = "Source:" in answer
    record("citation_present", case["id"], ok)
    assert ok, answer


@pytest.mark.parametrize("case", cases("answerable"))
def test_citation_accuracy(case, run):
    """The cited document must be the one that actually contains the answer."""
    answer = run(case)["answer"]
    cited = answer.split("Source: ")[-1].strip() if "Source: " in answer else ""
    ok = cited.startswith(case["expected_source"])
    record("citation_accuracy", case["id"], ok, cited)
    assert ok, f"cited {cited!r}, expected {case['expected_source']!r}"


@pytest.mark.parametrize("case", cases("answerable"))
def test_faithfulness(case, run):
    """Groundedness: every claim in the answer must be supported by retrieved context."""
    r = run(case)
    if REFUSAL in r["answer"]:
        pytest.skip("refused; nothing to judge")
    tc = LLMTestCase(
        input=case["question"],
        actual_output=strip_citation(r["answer"]),
        retrieval_context=[c["content"] for c in r["context"]],
    )
    metric = FaithfulnessMetric(threshold=THRESHOLD, model=JUDGE, async_mode=False)
    metric.measure(tc)
    record("faithfulness", case["id"], metric.success, round(metric.score, 2))
    assert metric.success, metric.reason


@pytest.mark.parametrize("case", cases("answerable"))
def test_answer_relevancy(case, run):
    r = run(case)
    if REFUSAL in r["answer"]:
        pytest.skip("refused; nothing to judge")
    tc = LLMTestCase(input=case["question"], actual_output=strip_citation(r["answer"]))
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=JUDGE, async_mode=False)
    metric.measure(tc)
    record("answer_relevancy", case["id"], metric.success, round(metric.score, 2))
    assert metric.success, metric.reason
