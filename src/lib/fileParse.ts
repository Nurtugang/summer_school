import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MIN_CHARS_PER_PAGE = 40;

export class ScannedPdfError extends Error {
  constructor() {
    super("Похоже, что это скан. Загрузите PDF с текстовым слоем.");
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    const pages = Math.max(result.total, 1);
    if (text.length < MIN_CHARS_PER_PAGE * pages) {
      throw new ScannedPdfError();
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
