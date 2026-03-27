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

export async function extractResumeText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (file.type === "application/pdf") {
    const { default: pdfParse } = await import("pdf-parse");
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
