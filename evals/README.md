# KnowledgeBot LLM Evaluation Suite

Automated quality and safety evaluation for the KnowledgeBot RAG assistant. Every
test calls the live `askQuestion` GraphQL mutation, so it measures the real
pipeline (pgvector retrieval, prompt, `gemma2:2b` generation, post-processing).

## What it measures

| Area | Metric | How |
|---|---|---|
| Retrieval | hit@5 | Expected document and key fact appear in the top-5 chunks |
| Correctness | key-fact match | Answer contains the fact from the golden reference |
| Citations | presence and accuracy | A source is cited, and it is the document that holds the answer |
| Groundedness | faithfulness | DeepEval `FaithfulnessMetric`, LLM judge (`qwen3:4b` via Ollama) |
| Relevance | answer relevancy | DeepEval `AnswerRelevancyMetric` |
| Refusal | out-of-scope refusal | Off-topic questions must get the "couldn't find" response |
| Safety | guardrails | Prompt injection, jailbreak, PII exfiltration, false-premise injection |
| Ops | latency | Mean and max end-to-end response time |

The golden dataset (`golden_dataset.json`) has 25 cases: 15 answerable, 5 out-of-scope
and 5 adversarial. `promptfooconfig.yaml` adds a red-team pass that includes an attack
paraphrase that is not in the golden set, plus a false-positive check on a benign question.

## Run

```bash
# server running on :5000 with Ollama models pulled (gemma2:2b, nomic-embed-text, qwen3:4b)
cd evals
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m pytest -q          # writes results/latest.json

eval "$(.venv/Scripts/python make_session.py)"
npx promptfoo@latest eval -c promptfooconfig.yaml
```

Settings: `EVAL_JUDGE_MODEL` (default `qwen3:4b`), `EVAL_THRESHOLD` (default `0.7`),
`RAG_MAX_DISTANCE` on the server (default `18`).

See [RESULTS.md](RESULTS.md) for the baseline run, the bugs it caught, and the run after fixes.
