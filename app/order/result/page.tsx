"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ServerOrder = {
  orderId: string;
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note: string | null;
  status: string;
  pageCount: number;
  pricePerPage: number;
  printSubtotal: number;
  folderFee: number;
  uniqueCode: number;
  grandTotal: number;
};

type OrderFile = {
  originalFilename: string;
  sizeBytes: number;
  isPdf: boolean;
  conversionStatus: string;
};

function formatRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResultPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("id");

  const [order, setOrder] = useState<ServerOrder | null>(null);
  const [file, setFile] = useState<OrderFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!orderId) {
      router.replace("/order");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Order tidak ditemukan.");
        }

        setOrder(json.order);
        setFile(json.file ?? null); // optional jika endpoint mengembalikan file
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat data order.");
      }
    })();
  }, [orderId, router]);

  const isEstimate = useMemo(() => {
    if (!order) return true;
    return order.status === "menunggu_pembayaran";
  }, [order]);

  async function handlePaid() {
    if (!orderId) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Gagal konfirmasi pembayaran.");
      router.push(`/order/success?id=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses konfirmasi.");
      setPaying(false);
    }
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
      {/* pertahankan UI Anda */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Summary</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        {/* ... step indicator tetap ... */}

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Ringkasan Order</h1>
        <p className="mb-8 text-sm text-gray-500">
          Periksa data dan harga sebelum melakukan pembayaran.
        </p>

        <div className="mb-5 rounded-xl bg-brand-50 px-5 py-4">
          <p className="text-xs font-medium text-brand-700">Order ID</p>
          <p className="mt-0.5 text-xl font-black tracking-widest text-brand-600">{order.orderId}</p>
        </div>

        {/* Informasi pelanggan */}
        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm">
          <Row label="Nama" value={order.customerName} />
          <Row label="Alamat" value={order.customerAddress} />
          <Row label="WhatsApp" value={order.customerWhatsapp} />
          {order.note && <Row label="Catatan" value={order.note} />}
        </div>

        {/* File info (jika tersedia dari API) */}
        {file && (
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm">
            <Row label="Nama file" value={file.originalFilename} />
            <Row label="Ukuran" value={formatBytes(file.sizeBytes)} />
            <Row
              label="Format"
              value={
                file.isPdf ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">PDF ✓</span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Non-PDF — perlu cek admin
                  </span>
                )
              }
            />
          </div>
        )}

        {/* Pricing real from server */}
        <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-5">
          {isEstimate && (
            <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
              ⚠️ Harga berdasarkan analisis sistem saat ini. Admin tetap dapat melakukan verifikasi akhir.
            </div>
          )}
          <div className="space-y-2 text-sm">
            <Row
              label={`${order.pageCount} halaman × ${formatRp(order.pricePerPage)}`}
              value={formatRp(order.printSubtotal)}
            />
            <Row label="Bungkus map dokumen" value={formatRp(order.folderFee)} />
            <Row label="Kode unik pembayaran" value={`+ ${formatRp(order.uniqueCode)}`} />
            <div className="my-2 border-t border-gray-200" />
            <Row
              label={<span className="font-semibold text-gray-900">Total Transfer</span>}
              value={<span className="font-bold text-gray-900 md:text-base">{formatRp(order.grandTotal)}</span>}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handlePaid}
          disabled={paying}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
        >
          {paying ? "Memproses…" : "✅ Saya Sudah Bayar"}
        </button>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}
