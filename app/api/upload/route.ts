import { NextRequest, NextResponse } from "next/server";
import {
  processUploadedFile,
  saveUploadedBufferToLocal,
  UPLOAD_ALLOWED_MIME_TYPES,
} from "@/lib/file";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File terlalu besar (maks 10MB)." },
        { status: 400 }
      );
    }

    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as (typeof UPLOAD_ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: "Format file tidak didukung." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = processUploadedFile({
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      buffer,
    });

    const storagePath = await saveUploadedBufferToLocal({
      buffer,
      safeName: result.safeName,
    });

    return NextResponse.json({
      ok: true,
      upload: {
        originalFilename: result.originalName,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        storagePath,
        isPdf: result.isPdf,
        conversionStatus: result.conversionStatus,
        needsManualCheck: result.manualCheckRequired,
        analysis: {
          pageCount: result.pageCount,
          confidence: result.analysisConfidence,
          notes: result.analysisNotes,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
