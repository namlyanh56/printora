import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { lookup as getMime } from "mime-types";

function toSafeAbsolutePath(parts: string[]): string {
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const relativePath = parts.join("/");

  // block path traversal
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.join(uploadsRoot, normalized);

  if (!abs.startsWith(uploadsRoot)) {
    throw new Error("Invalid file path.");
  }

  return abs;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: fileParts } = await params;

    if (!fileParts?.length) {
      return new Response("File path is required.", { status: 400 });
    }

    const absPath = toSafeAbsolutePath(fileParts);

    const stat = await fs.stat(absPath);
    if (!stat.isFile()) {
      return new Response("Not found.", { status: 404 });
    }

    const data = await fs.readFile(absPath);
    const fileName = path.basename(absPath);
    const mime = (getMime(fileName) || "application/octet-stream").toString();

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("File not found.", { status: 404 });
  }
}
