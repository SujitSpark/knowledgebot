import { config } from './config';

/**
 * Generates an embedding vector for the given text using local Ollama.
 * @param text The input text to embed
 * @returns Promise resolving to an array of numbers (768 dimensions for nomic-embed-text)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const url = `${config.ollamaApiUrl}/api/embeddings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollamaEmbedModel,
        prompt: text.replace(/\n/g, ' '),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API failed with status ${response.status}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid response structure from Ollama embedding API');
    }

    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding in ollama.ts:', error);
    throw error;
  }
}

/**
 * Generates LLM completion response using local Ollama.
 * @param prompt The prompt to pass to the model
 * @returns Promise resolving to the model's text response
 */
export async function generateResponse(prompt: string): Promise<string> {
  try {
    const url = `${config.ollamaApiUrl}/api/generate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ollamaGenModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // Keep it highly deterministic to avoid hallucination
          num_predict: 256,  // Limit responses to keep them concise
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama generation API failed with status ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response.trim();
  } catch (error) {
    console.error('Error generating response in ollama.ts:', error);
    throw error;
  }
}
