declare module 'pdf-parse' {
  export interface PDFTextItem {
    str: string;
    transform: number[];
  }

  export interface PDFTextContent {
    items: PDFTextItem[];
  }

  export interface PDFPageData {
    getTextContent: () => Promise<PDFTextContent>;
    pageIndex: number;
  }

  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsCollectionPresent: boolean;
    IsLinearized: boolean;
    IsSignaturesPresent: boolean;
    IsXFAPresent: boolean;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: unknown;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: PDFPageData) => Promise<string> | string;
    max?: number;
    version?: string;
  }

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

  export default pdf;
}
