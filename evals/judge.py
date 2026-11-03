"""Local LLM-as-judge for DeepEval backed by Ollama.

DeepEval's built-in OllamaModel cannot disable "thinking" on reasoning models
such as qwen3, which makes every judgement slow enough to time out. This judge
calls Ollama directly with think=False and JSON-schema constrained output.
"""
from typing import Optional

from deepeval.models import DeepEvalBaseLLM
from ollama import Client
from pydantic import BaseModel


class OllamaJudge(DeepEvalBaseLLM):
    def __init__(self, model: str, base_url: str):
        self.model_name = model
        self.base_url = base_url
        super().__init__(model)

    def load_model(self):
        return Client(host=self.base_url)

    def generate(self, prompt: str, schema: Optional[type[BaseModel]] = None):
        resp = self.model.chat(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            format=schema.model_json_schema() if schema else None,
            think=False,
            options={"temperature": 0},
        )
        text = resp.message.content
        return schema.model_validate_json(text) if schema else text

    async def a_generate(self, prompt: str, schema: Optional[type[BaseModel]] = None):
        return self.generate(prompt, schema)

    def get_model_name(self) -> str:
        return f"ollama/{self.model_name}"
