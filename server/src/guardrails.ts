/**
 * Lightweight input/output guardrails for the RAG pipeline.
 *
 * Input: block common prompt-injection and jailbreak phrasings before they
 * reach the LLM. Output: never return text that echoes the system prompt.
 * Regression cases for both live in evals/golden_dataset.json (X01-X05).
 */

export const GUARDRAIL_MESSAGE =
  "I can only help with questions about the ConnectWise documentation.";

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget)\b.{0,40}\b(previous|prior|above|earlier|all)\b.{0,20}\b(instructions?|rules?|prompts?|context)\b/i,
  /\b(system|developer|admin)\s*(override|mode|prompt)\b/i,
  /\byou\s+are\s+now\b/i,
  /\b(dev\s*mode|jailbreak|DAN)\b/,
  /\b(no|without)\s+(rules|restrictions|filters|guardrails)\b/i,
  /\bunrestricted\s+(ai|assistant|model|mode)\b/i,
  /\b(reveal|print|show|repeat|output)\b.{0,30}\b(system\s+prompt|instructions|hidden\s+prompt)\b/i,
  /\breply\s+only\s+with\b/i,
];

const LEAK_MARKERS = [
  "strict constraints",
  "[connectwise documentation context]",
  "never invent or hallucinate",
  "you are a customer support representative chatbot",
];

export function isPromptInjection(question: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(question));
}

/**
 * Output check for "make it say X" attacks: the answer repeats a quoted string
 * from the question that does not appear anywhere in the retrieved documentation.
 */
export function echoesInjectedText(question: string, answer: string, context: string): boolean {
  const quoted = [...question.matchAll(/['"‘’“”]([^'"‘’“”]{2,60})['"‘’“”]/g)].map((m) =>
    m[1].trim().toLowerCase()
  );
  const a = answer.toLowerCase();
  const ctx = context.toLowerCase();
  return quoted.some((q) => q.length >= 2 && a.includes(q) && !ctx.includes(q));
}

export function leaksSystemPrompt(answer: string): boolean {
  const a = answer.toLowerCase();
  return LEAK_MARKERS.some((m) => a.includes(m));
}
