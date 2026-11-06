"""Thin client for evaluating the live KnowledgeBot RAG pipeline.

Answers come from the real `askQuestion` GraphQL mutation. Retrieval context is
recomputed with the same embedding model and pgvector query the server uses, so
faithfulness can be judged against exactly the chunks the model was given.
"""
import os
import time
import uuid
from pathlib import Path

import psycopg
import requests
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
_env = {**dotenv_values(ROOT / "server" / ".env"), **os.environ}

DATABASE_URL = _env["DATABASE_URL"]
OLLAMA_URL = _env.get("OLLAMA_API_URL", "http://127.0.0.1:11434")
EMBED_MODEL = _env.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
GRAPHQL_URL = _env.get("KB_GRAPHQL_URL", f"http://localhost:{_env.get('PORT', '5000')}/graphql")

REFUSAL = "I couldn't find that information in the available ConnectWise documentation."

ASK_MUTATION = """
mutation Ask($sessionId: UUID!, $userId: UUID!, $question: String!) {
  askQuestion(sessionId: $sessionId, userId: $userId, question: $question) {
    content
    sourceCitations
  }
}
"""

RETRIEVAL_SQL = """
SELECT dc.content, dc.metadata, (e.embedding <-> %s::vector) AS distance
FROM embeddings e
JOIN document_chunks dc ON e.chunk_id = dc.id
ORDER BY distance ASC
LIMIT 5
"""


class KnowledgeBotClient:
    def __init__(self):
        self.conn = psycopg.connect(DATABASE_URL, autocommit=True)
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM users ORDER BY created_at LIMIT 1")
            self.user_id = str(cur.fetchone()[0])
            self.session_id = str(uuid.uuid4())
            cur.execute(
                "INSERT INTO chat_sessions (id, user_id, title) VALUES (%s, %s, %s)",
                (self.session_id, self.user_id, f"eval-run {time.strftime('%Y-%m-%d %H:%M')}"),
            )

    def embed(self, text: str) -> list[float]:
        r = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text.replace("\n", " ")},
            timeout=120,
        )
        r.raise_for_status()
        return r.json()["embedding"]

    def retrieve(self, question: str) -> list[dict]:
        vec = "[" + ",".join(map(str, self.embed(question))) + "]"
        with self.conn.cursor() as cur:
            cur.execute(RETRIEVAL_SQL, (vec,))
            return [
                {"content": c, "source": m.get("source"), "page": m.get("pageNumber"), "distance": float(d)}
                for c, m, d in cur.fetchall()
            ]

    def ask(self, question: str) -> dict:
        start = time.perf_counter()
        r = requests.post(
            GRAPHQL_URL,
            json={
                "query": ASK_MUTATION,
                "variables": {"sessionId": self.session_id, "userId": self.user_id, "question": question},
            },
            timeout=600,
        )
        latency = time.perf_counter() - start
        r.raise_for_status()
        body = r.json()
        if body.get("errors"):
            raise RuntimeError(body["errors"][0]["message"])
        data = body["data"]["askQuestion"]
        return {"answer": data["content"], "citations": data["sourceCitations"], "latency_s": latency}

    def close(self):
        self.conn.close()
