"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type SuccessOrder = {
  orderId: string;
  status: string;
};

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("id") ?? "—";
  const [status, setStatus] = useState<string>("memuat");

  useEffect(() => {
    if (!orderId || orderId === "—") return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        const json = await res.json();
        if (res.ok && json?.ok) setStatus(json.order.status);
        else setStatus("tidak_ditemukan");
      } catch {
        setStatus("error");
      }
    })();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-white">
      {/* UI Anda tetap */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900">
            Printora
          </Link>
          <span className="text-xs text-gray-400">Order Selesai</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20 pt-12 text-center">
        <div className="mx-auto mb-8 inline-block rounded-xl border border-brand-100 bg-brand-50 px-8 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Order ID Anda
          </p>
          <p className="mt-1 text-3xl font-black tracking-widest text-brand-600">{orderId}</p>
          <p className="mt-1 text-xs text-gray-400">Status server: {status}</p>
        </div>

        {/* ... section lainnya bisa dipertahankan persis ... */}
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
