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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const data = {
      name: form.name.trim(),
      address: form.address.trim(),
      whatsapp: form.whatsapp.trim(),
      note: form.note.trim(),
      fileName: file!.name,
      fileSize: file!.size,
      isPdf: file!.type === "application/pdf",
    };

    let stored = false;
    try {
      sessionStorage.setItem("printora_order", JSON.stringify(data));
      stored = true;
    } catch {
      // sessionStorage unavailable (e.g., private browsing quota exceeded)
    }

    if (!stored) {
      setSubmitting(false);
      setErrors({ fileName: "Gagal menyimpan data. Pastikan browser Anda tidak dalam mode penyamaran penuh atau coba refresh halaman." });
      return;
    }

    router.push("/order/result");
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Form</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
            1
          </span>
          <span className="text-gray-900">Isi Data</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">
            2
          </span>
          <span>Harga</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">
            3
          </span>
          <span>Selesai</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Form Order</h1>
        <p className="mb-8 text-sm text-gray-500">
          Isi data di bawah dan upload file dokumen Anda.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Nama */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="name">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="cth: Budi Santoso"
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 ${
                errors.name ? "border-red-400" : "border-gray-200"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Alamat */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="address">
              Alamat Lengkap
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={form.address}
              onChange={handleChange}
              placeholder="cth: Jl. Merdeka No. 10, Kec. Sukajadi, Kota Bandung"
              className={`w-full resize-none rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 ${
                errors.address ? "border-red-400" : "border-gray-200"
              }`}
            />
            {errors.address && <p className="mt-1.5 text-xs text-red-500">{errors.address}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="whatsapp">
              Nomor WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="cth: 08123456789"
              className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 ${
                errors.whatsapp ? "border-red-400" : "border-gray-200"
              }`}
            />
            {errors.whatsapp && <p className="mt-1.5 text-xs text-red-500">{errors.whatsapp}</p>}
          </div>

          {/* Catatan */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="note">
              Catatan{" "}
              <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              value={form.note}
              onChange={handleChange}
              placeholder="cth: Tolong cetak 2 sisi, jilid spiral"
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Upload File */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Upload File
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragOver
                  ? "border-brand-600 bg-brand-50"
                  : errors.fileName
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200 hover:border-brand-600 hover:bg-brand-50"
              }`}
            >
              {file ? (
                <>
                  <p className="text-2xl">📄</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-3 text-xs text-red-400 underline hover:text-red-600"
                  >
                    Hapus file
                  </button>
                </>
              ) : (
                <>
                  <p className="text-3xl">☁️</p>
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Drag & drop atau{" "}
                    <span className="text-brand-600 underline">klik untuk pilih file</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    PDF, Word, Excel, PowerPoint, JPG, PNG
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {!file && (
              <p className="mt-1.5 text-xs text-gray-400">
                File non-PDF akan dikonversi. Butuh pengecekan manual oleh admin.
              </p>
            )}
            {errors.fileName && (
              <p className="mt-1.5 text-xs text-red-500">{errors.fileName}</p>
            )}
          </div>

          {/* Submit */}
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
