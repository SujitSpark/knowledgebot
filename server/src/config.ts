import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/knowledge_bot',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_key_for_knowledge_bot_jwt',
  ollamaApiUrl: process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434',
  ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  ollamaGenModel: process.env.OLLAMA_GEN_MODEL || 'gemma2:2b',
  // Questions whose nearest chunk is farther than this (pgvector L2) are refused as off-topic.
  // Calibrated with evals/: answerable questions top out at ~16.3, off-topic ones reach 17.6-22.2.
  maxRetrievalDistance: parseFloat(process.env.RAG_MAX_DISTANCE || '18'),
};
