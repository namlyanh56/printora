"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrderData = {
  name: string;
  address: string;
  whatsapp: string;
  note: string;
  fileName: string;
  fileSize: number;
  isPdf: boolean;
};

// Pricing constants (client-safe, no env dependency)
const PRICE_PER_PAGE = { bw: 500, light: 1000, full: 1500 } as const;
const FOLDER_FEE = 500;
const UNIQUE_CODE_MAX = 400;

function genOrderId() {
  const n = Math.floor(Math.random() * 100000);
  return `PNR${n.toString().padStart(5, "0")}`;
}

function genUniqueCode() {
  return Math.floor(Math.random() * UNIQUE_CODE_MAX) + 1;
}

function formatRp(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResultPage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderId] = useState(genOrderId);
  const [uniqueCode] = useState(genUniqueCode);
  const [paying, setPaying] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Estimated defaults (admin confirms actual after file analysis)
  const estimatedPages = 5;
  const estimatedTier: keyof typeof PRICE_PER_PAGE = "bw";
  const pricePerPage = PRICE_PER_PAGE[estimatedTier];
  const pagesAmount = estimatedPages * pricePerPage;
  const totalAmount = pagesAmount + FOLDER_FEE + uniqueCode;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("printora_order");
      if (raw) setOrder(JSON.parse(raw) as OrderData);
      else router.replace("/order");
    } catch {
      setError("Gagal memuat data order. Silakan ulangi dari awal.");
    }
  }, [router]);

  function handlePaid() {
    setPaying(true);
    try {
      sessionStorage.setItem("printora_order_id", orderId);
    } catch { /* continue */ }
    router.push(`/order/success?id=${orderId}`);
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <a href="/order" className="text-sm font-medium text-brand-600 underline">
          Kembali ke Form Order
        </a>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Memuat data order…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Summary</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-gray-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white">
            ✓
          </span>
          <span>Isi Data</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
            2
          </span>
          <span className="text-gray-900">Harga</span>
          <span className="mx-1">—</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200">
            3
          </span>
          <span>Selesai</span>
        </div>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Ringkasan Order</h1>
        <p className="mb-8 text-sm text-gray-500">
          Periksa data dan harga sebelum melakukan pembayaran.
        </p>

        {/* Order ID */}
        <div className="mb-5 rounded-xl bg-brand-50 px-5 py-4">
          <p className="text-xs font-medium text-brand-700">Order ID</p>
          <p className="mt-0.5 text-xl font-black tracking-widest text-brand-600">{orderId}</p>
        </div>

        {/* Informasi Pelanggan */}
        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Informasi Pelanggan
          </p>
          <div className="space-y-2 text-sm">
            <Row label="Nama" value={order.name} />
            <Row label="Alamat" value={order.address} />
            <Row label="WhatsApp" value={order.whatsapp} />
            {order.note && <Row label="Catatan" value={order.note} />}
          </div>
        </div>

        {/* File */}
        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            File Dokumen
          </p>
          <div className="space-y-2 text-sm">
            <Row label="Nama file" value={order.fileName} />
            <Row label="Ukuran" value={formatBytes(order.fileSize)} />
            <Row
              label="Format"
              value={
                order.isPdf ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    PDF ✓
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Non-PDF — perlu cek admin
                  </span>
                )
              }
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Estimasi Harga
          </p>
          <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
            ⚠️ Harga di bawah adalah <strong>estimasi awal</strong>. Harga final akan dikonfirmasi admin setelah analisis file.
          </div>
          <div className="space-y-2 text-sm">
            <Row
              label={`${estimatedPages} halaman × ${formatRp(pricePerPage)}`}
              value={formatRp(pagesAmount)}
            />
            <Row label="Bungkus map dokumen" value={formatRp(FOLDER_FEE)} />
            <Row label="Kode unik pembayaran" value={`+ ${formatRp(uniqueCode)}`} />
            <div className="my-2 border-t border-gray-200" />
            <Row
              label={<span className="font-semibold text-gray-900">Total Transfer</span>}
              value={
                <span className="font-bold text-gray-900 md:text-base">{formatRp(totalAmount)}</span>
              }
            />
          </div>
        </div>

        {/* QRIS */}
        <div className="mb-8 rounded-xl border border-gray-200 p-5 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Pembayaran via QRIS
          </p>
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-gray-100 text-gray-300">
            <span className="text-xs font-medium">[ QRIS statis akan tampil di sini ]</span>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700">
            Transfer tepat:{" "}
            <span className="font-bold text-gray-900">{formatRp(totalAmount)}</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Kode unik membantu admin verifikasi pembayaran Anda secara otomatis.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handlePaid}
          disabled={paying}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
        >
          {paying ? "Memproses…" : "✅ Saya Sudah Bayar"}
        </button>
        <p className="mt-3 text-center text-xs text-gray-400">
          Tombol ini menandai order Anda sebagai &quot;menunggu verifikasi&quot; admin.
        </p>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}
