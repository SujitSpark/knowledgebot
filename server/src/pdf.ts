/// <reference path="./types.d.ts" />
import pdf, { PDFPageData } from 'pdf-parse';

export interface DocumentChunk {
  content: string;
  metadata: {
    pageNumber?: number;
    source: string;
    type: 'pdf' | 'faq';
  };
}

/**
 * Parses PDF buffer page-by-page.
 * @param buffer PDF file buffer
 */
export async function parsePdfPages(buffer: Buffer): Promise<{ page: number; text: string }[]> {
  const pages: { page: number; text: string }[] = [];

  const options = {
    pagerender: async (pageData: PDFPageData) => {
      const textContent = await pageData.getTextContent();
      let lastY: number | undefined;
      let text = '';
      for (const item of textContent.items) {
        if (lastY === undefined || lastY === item.transform[5]) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      pages.push({ page: pageData.pageIndex + 1, text });
      return text;
    },
  };

  try {
    await pdf(buffer, options);
  } catch (error) {
    console.error('Error in pdf-parse page rendering, falling back to full text parse:', error);
    // Fallback: parse entire document if custom render fails
    const data = await pdf(buffer);
    return [{ page: 1, text: data.text }];
  }

  // Sort pages in ascending order
  return pages.sort((a, b) => a.page - b.page);
}

/**
 * Chunks PDF pages into overlapping text segments.
 */
export function chunkPdfPages(
  pages: { page: number; text: string }[],
  sourceName: string,
  chunkSize = 600,
  overlap = 120
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const p of pages) {
    const text = p.text.trim();
    if (text.length < 50) continue; // Skip very empty pages

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + chunkSize;
      if (endIndex > text.length) {
        endIndex = text.length;
      }

      const content = text.slice(startIndex, endIndex).trim();
      if (content.length > 50) {
        chunks.push({
          content,
          metadata: {
            pageNumber: p.page,
            source: sourceName,
            type: 'pdf',
          },
        });
      }

      startIndex += chunkSize - overlap;
      chunkIndex++;
    }
  }

  return chunks;
}

/**
 * Chunks FAQ Markdown by splitting into Q&A header sections.
 */
export function chunkFaqMarkdown(content: string, sourceName: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  // Split by Markdown H3 headings or similar Q&A dividers
  // Typically: "### Q: ..." or "## Q: ..."
  const sections = content.split(/(?=^##+ .*)/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Check if section is too large, if so, sub-chunk it
    if (trimmed.length > 800) {
      let startIndex = 0;
      const subChunkSize = 600;
      const subOverlap = 120;

      while (startIndex < trimmed.length) {
        let endIndex = startIndex + subChunkSize;
        if (endIndex > trimmed.length) {
          endIndex = trimmed.length;
        }
        const subContent = trimmed.slice(startIndex, endIndex).trim();
        if (subContent.length > 50) {
          chunks.push({
            content: subContent,
            metadata: {
              source: sourceName,
              type: 'faq',
            },
          });
        }
        startIndex += subChunkSize - subOverlap;
      }
    } else {
      chunks.push({
        content: trimmed,
        metadata: {
          source: sourceName,
          type: 'faq',
        },
      });
    }
  }

  return chunks;
}
