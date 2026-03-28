import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

/**
 * File Processing Engine (MVP, compact single-domain file)
 * Clear separation in one file:
 * 1) file acceptance
 * 2) file classification
 * 3) PDF analysis
 * 4) manual-check flagging
 */

/* =========================================================
   SHARED UPLOAD MIME TYPES (single source of truth)
========================================================= */

export const UPLOAD_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
] as const;

/* =========================================================
   TYPES & STATUS
========================================================= */

export const FILE_CLASS = {
  PDF: "pdf",
  NON_PDF: "non_pdf",
} as const;

export type FileClass = (typeof FILE_CLASS)[keyof typeof FILE_CLASS];

export const CONVERSION_STATUS = {
  NOT_NEEDED: "not_needed",
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

export type ConversionStatus =
  (typeof CONVERSION_STATUS)[keyof typeof CONVERSION_STATUS];

export type AcceptedUpload = {
  originalName: string;
  safeName: string;
  mimeType: string;
  sizeBytes: number;
  ext: string;
  buffer: Buffer;
  sha256: string;
};

export type ClassifiedFile = AcceptedUpload & {
  fileClass: FileClass;
  isPdf: boolean;
};

export type PdfAnalysisResult = {
  ok: boolean;
  pageCount: number | null;
  confidence: number; // 0..1
  colorHint: "bw" | "light_color" | "full_color" | "unknown";
  notes: string[];
};

export type FileProcessingResult = {
  fileClass: FileClass;
  isPdf: boolean;
  conversionStatus: ConversionStatus;
  manualCheckRequired: boolean;

  pageCount: number | null;
  analysisConfidence: number | null;
  analysisNotes: string[];

  originalName: string;
  safeName: string;
  mimeType: string;
  sizeBytes: number;
  ext: string;
  sha256: string;
};

/* =========================================================
   1) FILE ACCEPTANCE
========================================================= */

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 140;

const fileInputSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});

export function acceptFile(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}): AcceptedUpload {
  fileInputSchema.parse({
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  if (!Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
    throw new Error("Invalid file buffer.");
  }

  if (input.buffer.length !== input.sizeBytes) {
    throw new Error("File size mismatch.");
  }

  const safeName = sanitizeFileName(input.originalName);
  const ext = path.extname(safeName).toLowerCase().replace(".", "");
  const sha256 = crypto.createHash("sha256").update(input.buffer).digest("hex");

  return {
    originalName: input.originalName,
    safeName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    ext,
    buffer: input.buffer,
    sha256,
  };
}

function sanitizeFileName(name: string): string {
  const base = name
    .normalize("NFKC")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const trimmed = base.slice(0, MAX_FILENAME_LENGTH);
  return trimmed.length > 0 ? trimmed : `upload-${Date.now()}`;
}

/* =========================================================
   LOCAL FILE STORAGE HELPER
========================================================= */

export async function saveUploadedBufferToLocal(input: {
  buffer: Buffer;
  safeName: string;
}): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(input.safeName);
  const base = path.basename(input.safeName, ext);
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${ext}`;
  const absolutePath = path.join(uploadsDir, uniqueName);

  await fs.writeFile(absolutePath, input.buffer);

  return `/uploads/${uniqueName}`;
}

/* =========================================================
   2) FILE CLASSIFICATION
========================================================= */

export function classifyFile(file: AcceptedUpload): ClassifiedFile {
  const looksLikePdfByMime = file.mimeType.toLowerCase() === "application/pdf";
  const looksLikePdfBySignature = hasPdfSignature(file.buffer);
  const isPdf = looksLikePdfByMime || looksLikePdfBySignature;

  return {
    ...file,
    fileClass: isPdf ? FILE_CLASS.PDF : FILE_CLASS.NON_PDF,
    isPdf,
  };
}

function hasPdfSignature(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

/* =========================================================
   3) PDF ANALYSIS (MVP)
========================================================= */

export function analyzePdfMvp(buffer: Buffer): PdfAnalysisResult {
  try {
    const text = buffer.toString("latin1");
    const pageTokenMatches = text.match(/\/Type\s*\/Page\b/g);
    const pageCountRaw = pageTokenMatches?.length ?? 0;

    if (pageCountRaw <= 0) {
      return {
        ok: false,
        pageCount: null,
        confidence: 0.2,
        colorHint: "unknown",
        notes: ["PDF parsed but page markers not found."],
      };
    }

    const hasColorOps =
      /(?:\srg\s|\sRG\s|\sk\s|\sK\s|\sscn\s|\sSCN\s)/.test(text);

    return {
      ok: true,
      pageCount: pageCountRaw,
      confidence: 0.75,
      colorHint: hasColorOps ? "light_color" : "bw",
      notes: ["MVP heuristic parser used."],
    };
  } catch {
    return {
      ok: false,
      pageCount: null,
      confidence: 0,
      colorHint: "unknown",
      notes: ["Failed to analyze PDF content."],
    };
  }
}

/* =========================================================
   4) MANUAL CHECK FLAGGING + ORCHESTRATION
========================================================= */

export function processUploadedFile(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}): FileProcessingResult {
  const accepted = acceptFile(input);
  const classified = classifyFile(accepted);

  if (classified.fileClass === FILE_CLASS.NON_PDF) {
    return {
      fileClass: FILE_CLASS.NON_PDF,
      isPdf: false,
      conversionStatus: CONVERSION_STATUS.PENDING,
      manualCheckRequired: true,

      pageCount: null,
      analysisConfidence: null,
      analysisNotes: [
        "Non-PDF file accepted.",
        "Marked for conversion to PDF.",
        "Manual admin check required.",
      ],

      originalName: classified.originalName,
      safeName: classified.safeName,
      mimeType: classified.mimeType,
      sizeBytes: classified.sizeBytes,
      ext: classified.ext,
      sha256: classified.sha256,
    };
  }

  const analysis = analyzePdfMvp(classified.buffer);
  const manualCheckRequired = !analysis.ok || analysis.confidence < 0.6;

  return {
    fileClass: FILE_CLASS.PDF,
    isPdf: true,
    conversionStatus: CONVERSION_STATUS.NOT_NEEDED,
    manualCheckRequired,

    pageCount: analysis.pageCount,
    analysisConfidence: analysis.confidence,
    analysisNotes: analysis.notes,

    originalName: classified.originalName,
    safeName: classified.safeName,
    mimeType: classified.mimeType,
    sizeBytes: classified.sizeBytes,
    ext: classified.ext,
    sha256: classified.sha256,
  };
}
