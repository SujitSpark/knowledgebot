import { makeExtendSchemaPlugin, gql } from 'graphile-utils';
import { generateEmbedding, generateResponse } from './ollama';
import { parsePdfPages, chunkPdfPages, chunkFaqMarkdown, DocumentChunk } from './pdf';
import fs from 'fs';
import path from 'path';

interface SearchChunkRow {
  content: string;
  metadata: {
    source: string;
    pageNumber?: number;
    [key: string]: unknown;
  };
}

export const KnowledgeBotSchemaPlugin = makeExtendSchemaPlugin((build) => {
  return {
    typeDefs: gql`
      input UploadDocumentInput {
        name: String!
        base64Data: String!
      }

      type UploadDocumentPayload {
        success: Boolean!
        documentId: UUID
        name: String!
        chunkCount: Int!
      }

      type AskQuestionPayload {
        messageId: UUID!
        sessionId: UUID!
        sender: String!
        content: String!
        sourceCitations: JSON!
        createdAt: Datetime!
      }

      extend type Mutation {
        uploadDocument(input: UploadDocumentInput!): UploadDocumentPayload!
        reindexDocuments: Boolean!
        askQuestion(sessionId: UUID!, userId: UUID!, question: String!): AskQuestionPayload!
      }
    `,
    resolvers: {
      Mutation: {
        uploadDocument: async (_query, args, context, info) => {
          const { pgClient } = context;
          const { name, base64Data } = args.input;

          try {
            const pdfBuffer = Buffer.from(base64Data, 'base64');

            const uploadsDir = path.resolve(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const safeFileName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const filePath = path.join(uploadsDir, safeFileName);
            fs.writeFileSync(filePath, pdfBuffer);

            const pages = await parsePdfPages(pdfBuffer);
            const chunks = chunkPdfPages(pages, name);

            const docResult = await pgClient.query(
              'INSERT INTO documents (name, file_path) VALUES ($1, $2) RETURNING id',
              [name, filePath]
            );
            const documentId = docResult.rows[0].id;

            let chunkCount = 0;
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              const chunkResult = await pgClient.query(
                `INSERT INTO document_chunks (document_id, chunk_index, content, metadata) 
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [documentId, i, chunk.content, JSON.stringify(chunk.metadata)]
              );
              const chunkId = chunkResult.rows[0].id;

              const vector = await generateEmbedding(chunk.content);
              const vectorString = `[${vector.join(',')}]`;

              await pgClient.query(
                'INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2::vector)',
                [chunkId, vectorString]
              );
              chunkCount++;
            }

            return {
              success: true,
              documentId,
              name,
              chunkCount,
            };
          } catch (error) {
            console.error('Error in uploadDocument mutation:', error);
            throw new Error(`Failed to upload and index document: ${(error as Error).message}`);
          }
        },

        reindexDocuments: async (_query, args, context, info) => {
          const { pgClient } = context;

          try {
            console.log('Reindexing starting: Clearing existing documents...');
            await pgClient.query('DELETE FROM documents');

            const docsDir = path.resolve(__dirname, '../../docs');
            if (!fs.existsSync(docsDir)) {
              console.log('Docs directory not found, creating it...');
              fs.mkdirSync(docsDir, { recursive: true });
              return true;
            }

            const files = fs.readdirSync(docsDir);
            let indexedCount = 0;

            for (const file of files) {
              const filePath = path.join(docsDir, file);
              const ext = path.extname(file).toLowerCase();

              if (ext === '.pdf') {
                console.log(`Indexing PDF: ${file}`);
                const buffer = fs.readFileSync(filePath);
                const pages = await parsePdfPages(buffer);
                const chunks = chunkPdfPages(pages, 'ConnectWise Security Best Practices');

                const docResult = await pgClient.query(
                  'INSERT INTO documents (name, file_path) VALUES ($1, $2) RETURNING id',
                  ['ConnectWise Security Best Practices', filePath]
                );
                const docId = docResult.rows[0].id;

                for (let i = 0; i < chunks.length; i++) {
                  const chunk = chunks[i];
                  const chunkResult = await pgClient.query(
                    'INSERT INTO document_chunks (document_id, chunk_index, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id',
                    [docId, i, chunk.content, JSON.stringify(chunk.metadata)]
                  );
                  const chunkId = chunkResult.rows[0].id;
                  const vector = await generateEmbedding(chunk.content);
                  const vectorString = `[${vector.join(',')}]`;
                  await pgClient.query('INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2::vector)', [chunkId, vectorString]);
                }
                indexedCount++;
              } else if (ext === '.md' || file === 'ConnectWise_FAQ.md') {
                console.log(`Indexing FAQ Markdown: ${file}`);
                const content = fs.readFileSync(filePath, 'utf-8');
                const chunks = chunkFaqMarkdown(content, 'ConnectWise FAQ');

                const docResult = await pgClient.query(
                  'INSERT INTO documents (name, file_path) VALUES ($1, $2) RETURNING id',
                  ['ConnectWise FAQ', filePath]
                );
                const docId = docResult.rows[0].id;

                for (let i = 0; i < chunks.length; i++) {
                  const chunk = chunks[i];
                  const chunkResult = await pgClient.query(
                    'INSERT INTO document_chunks (document_id, chunk_index, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id',
                    [docId, i, chunk.content, JSON.stringify(chunk.metadata)]
                  );
                  const chunkId = chunkResult.rows[0].id;
                  const vector = await generateEmbedding(chunk.content);
                  const vectorString = `[${vector.join(',')}]`;
                  await pgClient.query('INSERT INTO embeddings (chunk_id, embedding) VALUES ($1, $2::vector)', [chunkId, vectorString]);
                }
                indexedCount++;
              }
            }

            console.log(`Successfully reindexed ${indexedCount} documents.`);
            return true;
          } catch (error) {
            console.error('Error reindexing documents:', error);
            throw new Error(`Reindex failed: ${(error as Error).message}`);
          }
        },

        askQuestion: async (_query, args, context, info) => {
          const { pgClient } = context;
          const { sessionId, userId, question } = args;

          try {
            await pgClient.query(
              'INSERT INTO messages (session_id, sender, content) VALUES ($1, $2, $3)',
              [sessionId, 'user', question]
            );

            const normalizedText = question.trim().toLowerCase().replace(/[^a-zA-Z ]/g, "");
            const isGreeting = /^(hi+|hello+|hey+|yo+|sup+|howdy|greetings|good\s+morning|good\s+afternoon|good\s+evening)$/i.test(normalizedText);
            const isFarewell = /^(bye+|goodbye+|see\s+ya|see\s+you\s+later|exit|quit)$/i.test(normalizedText);
            const isThankYou = /^(thanks+|thank\s+you(\s+so\s+much)?|thx|appreciate\s+it)$/i.test(normalizedText);
            const isConversational = isGreeting || isFarewell || isThankYou;

            const queryVector = await generateEmbedding(question);
            const vectorString = `[${queryVector.join(',')}]`;

            const similarityQuery = `
              SELECT dc.content, dc.metadata, (e.embedding <-> $1::vector) AS distance
              FROM embeddings e
              JOIN document_chunks dc ON e.chunk_id = dc.id
              ORDER BY distance ASC
              LIMIT 5
            `;
            const searchResult = await pgClient.query(similarityQuery, [vectorString]);
            const chunks = searchResult.rows;

            let contextText = '';
            const citations: { source: string; pageNumber?: number }[] = [];

            if (chunks.length > 0) {
              contextText = chunks
                .map((c: SearchChunkRow, index: number) => {
                  const metadata = c.metadata;
                  const pageInfo = metadata.pageNumber ? ` Page ${metadata.pageNumber}` : '';
                  
                  const hasCitation = citations.some(
                    (cit) => cit.source === metadata.source && cit.pageNumber === metadata.pageNumber
                  );
                  if (!hasCitation) {
                    citations.push({
                      source: metadata.source,
                      pageNumber: metadata.pageNumber,
                    });
                  }

                  return `[Chunk ${index + 1} - Source: ${metadata.source}${pageInfo}]\n${c.content}`;
                })
                .join('\n\n');
            }

            const prompt = `You are a Customer Support Representative chatbot for ConnectWise.
You must answer the user's question using the provided ConnectWise documentation context.

Follow these strict constraints:
1. For general greetings, introductions, farewells, or thank-yous (e.g., "Hi", "Hello", "Thanks", "Goodbye"), respond politely, friendly, and naturally as a support representative. Do not mention page citations for greetings.
2. For any technical, product, or support queries about ConnectWise, you must answer using ONLY the context provided below.
3. If the answer to a technical/support question is not found inside the provided documentation context, politely say:
   "I couldn't find that information in the available ConnectWise documentation."
4. Never invent or hallucinate technical information.
5. Keep the answer professional, friendly, helpful, and concise.

[ConnectWise Documentation Context]:
${contextText || "No documentation context available."}

[User Question]:
${question}

[Answer]:`;

            let rawAnswer = await generateResponse(prompt);

            const normalizedAnswer = rawAnswer.toLowerCase();
            const notFoundMatches = [
              "couldn't find", "could not find", "not found",
              "i don't know", "i do not know", "unavailable",
              "don't have information", "no information",
              "cannot locate", "couldn't locate", "could not locate",
              "not mentioned", "not provided"
            ];
            
            const isNotFound = notFoundMatches.some(phrase => normalizedAnswer.includes(phrase));
            
            let finalAnswer = rawAnswer;
            if (isNotFound && !isConversational) {
              finalAnswer = "I couldn't find that information in the available ConnectWise documentation.";
            } else if (!isConversational && chunks.length > 0) {
              const pdfCitation = citations.find(c => c.source === 'ConnectWise Security Best Practices' && c.pageNumber);
              if (pdfCitation) {
                finalAnswer += `\n\nSource: ConnectWise Security Best Practices Page ${pdfCitation.pageNumber}`;
              } else if (citations.length > 0) {
                const primary = citations[0];
                const pageLabel = primary.pageNumber ? ` Page ${primary.pageNumber}` : '';
                finalAnswer += `\n\nSource: ${primary.source}${pageLabel}`;
              }
            }

            const botResult = await pgClient.query(
              `INSERT INTO messages (session_id, sender, content, source_citation) 
               VALUES ($1, $2, $3, $4) 
               RETURNING id, created_at`,
              [sessionId, 'bot', finalAnswer, JSON.stringify(citations)]
            );
            const botMessageId = botResult.rows[0].id;
            const createdAt = botResult.rows[0].created_at;

            return {
              messageId: botMessageId,
              sessionId,
              sender: 'bot',
              content: finalAnswer,
              sourceCitations: citations,
              createdAt,
            };
          } catch (error) {
            console.error('Error in askQuestion mutation:', error);
            throw new Error(`Failed to resolve question: ${(error as Error).message}`);
          }
        },
      },
    },
  };
});
