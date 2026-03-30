import mammoth from "mammoth";

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function validateResume(file: File) {
  if (!ACCEPTED_RESUME_TYPES.includes(file.type)) {
    throw new Error("Resume must be a PDF or DOCX file.");
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("Resume must be smaller than 8 MB.");
  }
}

/**
 * Read the file into a Buffer once - the Web API File can have its
 * arrayBuffer consumed, so we do this early and pass the buffer around.
 */
export async function readFileBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // Import from lib/pdf-parse directly to avoid the debug code in
    // pdf-parse/index.js that tries to read ./test/data/05-versions-space.pdf
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default ?? mod;
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  const parsed = await mammoth.extractRawText({ buffer });
  return parsed.value;
}

export function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  return Array.from(new Set(matches));
}
