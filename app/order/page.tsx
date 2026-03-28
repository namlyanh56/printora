"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type FormData = {
  name: string;
  address: string;
  whatsapp: string;
  note: string;
  fileName: string;
  fileSize: number;
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
];

type UploadResponse = {
  ok: boolean;
  upload: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    isPdf: boolean;
    conversionStatus: "not_needed" | "pending" | "success" | "failed";
    needsManualCheck: boolean;
    analysis: {
      pageCount: number | null;
      confidence: number | null;
      notes: string[];
      colorHint?: "bw" | "light_color" | "full_color" | "unknown";
    };
  };
  error?: string;
};

type CreateOrderResponse = {
  ok: boolean;
  order?: { orderId: string };
  error?: string;
};

export default function OrderPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", address: "", whatsapp: "", note: "" });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleFile(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    if (errors.fileName) setErrors((prev) => ({ ...prev, fileName: undefined }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi.";
    if (!form.address.trim()) next.address = "Alamat wajib diisi.";
    if (!form.whatsapp.trim()) next.whatsapp = "Nomor WhatsApp wajib diisi.";
    else if (!/^(\+62|62|0)8\d{8,11}$/.test(form.whatsapp.replace(/\s/g, "")))
      next.whatsapp = "Format nomor tidak valid (contoh: 08123456789).";
    if (!file) next.fileName = "File dokumen wajib diupload.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function mapColorHintToPrintTier(
    hint: UploadResponse["upload"]["analysis"]["colorHint"]
  ): "bw" | "light_color" | "full_color" {
    if (hint === "full_color") return "full_color";
    if (hint === "light_color") return "light_color";
    return "bw";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!file) return;

    setSubmitting(true);
    setErrors({});

    try {
      // 1) Upload + classify + analyze
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      const uploadJson = (await uploadRes.json()) as UploadResponse;

      if (!uploadRes.ok || !uploadJson.ok) {
        throw new Error(uploadJson.error || "Gagal upload file.");
      }

      const pageCount = uploadJson.upload.analysis.pageCount ?? 1;
      const printTier = mapColorHintToPrintTier(uploadJson.upload.analysis.colorHint);

      // 2) Create real order in DB
      const orderPayload = {
        customerName: form.name.trim(),
        customerAddress: form.address.trim(),
        customerWhatsapp: form.whatsapp.trim(),
        note: form.note.trim() || null,
        pageCount,
        printTier,
        file: {
          originalFilename: uploadJson.upload.originalFilename,
          mimeType: uploadJson.upload.mimeType,
          sizeBytes: uploadJson.upload.sizeBytes,
          storagePath: uploadJson.upload.storagePath,
          isPdf: uploadJson.upload.isPdf,
          conversionStatus: uploadJson.upload.conversionStatus,
          analysisPageCount: uploadJson.upload.analysis.pageCount,
          analysisConfidence: uploadJson.upload.analysis.confidence,
          manualCheckRequired: uploadJson.upload.needsManualCheck,
          analysisNotes: uploadJson.upload.analysis.notes,
        },
      };

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderJson = (await orderRes.json()) as CreateOrderResponse;

      if (!orderRes.ok || !orderJson.ok || !orderJson.order?.orderId) {
        throw new Error(orderJson.error || "Gagal membuat order.");
      }

      router.push(`/order/result?id=${encodeURIComponent(orderJson.order.orderId)}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses order.";
      setErrors((prev) => ({
        ...prev,
        fileName: msg,
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Form</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">1</span>
          <span className="text-gray-900">Isi Data</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">2</span>
          <span>Harga</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">3</span>
          <span>Selesai</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Form Order</h1>
        <p className="mb-8 text-sm text-gray-500">Isi data di bawah dan upload file dokumen Anda.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* ... UI sama seperti versi Anda ... */}
          {/* (tetap gunakan seluruh blok input yang sudah Anda buat) */}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
            >
              {submitting ? "Memproses..." : "Lihat Estimasi Harga →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
