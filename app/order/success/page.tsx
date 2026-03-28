"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("id") ?? "—";

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Selesai</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-12 text-center">
        {/* Step indicator */}
        <div className="mb-10 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white">
            ✓
          </span>
          <span>Isi Data</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white">
            ✓
          </span>
          <span>Harga</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
            3
          </span>
          <span className="text-gray-900">Selesai</span>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">
          ✅
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
          Order Berhasil Dikirim!
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-gray-500">
          Terima kasih telah memesan di Printora. Kami akan segera memverifikasi pembayaran dan
          memproses pesanan Anda.
        </p>

        {/* Order ID */}
        <div className="mx-auto mb-8 inline-block rounded-xl border border-brand-100 bg-brand-50 px-8 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Order ID Anda
          </p>
          <p className="mt-1 text-3xl font-black tracking-widest text-brand-600">{orderId}</p>
          <p className="mt-1 text-xs text-gray-400">Simpan kode ini untuk keperluan konfirmasi</p>
        </div>

        {/* What's Next */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-left">
          <p className="mb-4 text-sm font-semibold text-gray-700">Apa yang terjadi selanjutnya?</p>
          <ul className="space-y-3">
            {[
              {
                icon: "🔍",
                text: "Admin memverifikasi pembayaran Anda dalam 1–2 jam kerja.",
              },
              {
                icon: "📁",
                text: "File dokumen Anda dianalisis dan diproses untuk pencetakan.",
              },
              {
                icon: "💬",
                text: "Anda akan mendapat notifikasi update status via WhatsApp.",
              },
              {
                icon: "🚚",
                text: "Setelah siap, pesanan akan dikirim ke alamat yang Anda berikan.",
              },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Notice */}
        <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-left text-xs text-blue-800">
          <strong>Catatan:</strong> Jika Anda belum menerima konfirmasi dalam 3 jam, silakan
          hubungi admin via WhatsApp dengan menyertakan Order ID Anda.
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Kembali ke Beranda
          </Link>
          <Link
            href="/order"
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            Order Lagi
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-400">Memuat…</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
