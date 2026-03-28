import Link from "next/link";
import { notFound } from "next/navigation";
import { formatRupiah, getAdminOrderDetail, adminUpdateOrderStatus } from "@/lib/admin";
import { ORDER_STATUS } from "@/lib/order-management";

async function updateStatusAction(formData: FormData) {
  "use server";
  const orderDbId = String(formData.get("orderDbId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  if (!orderDbId || !nextStatus) return;
  await adminUpdateOrderStatus({ orderDbId, nextStatusLabel: nextStatus, actor: "admin" });
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminOrderDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
          ← Kembali ke dashboard
        </Link>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {detail.status}
        </span>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">Order {detail.orderId}</h1>
        <p className="mt-1 text-sm text-gray-500">{new Date(detail.createdAt).toLocaleString("id-ID")}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Cell label="Nama" value={detail.customerName} />
          <Cell label="WhatsApp" value={detail.customerWhatsapp} />
          <Cell label="Alamat" value={detail.customerAddress} />
          <Cell label="Catatan" value={detail.note || "-"} />
          <Cell label="Halaman" value={String(detail.pageCount)} />
          <Cell label="Kategori Warna" value={detail.colorCategory} />
          <Cell label="Harga per halaman" value={formatRupiah(detail.pricePerPage)} />
          <Cell label="Subtotal Print" value={formatRupiah(detail.pagesAmount)} />
          <Cell label="Biaya Map" value={formatRupiah(detail.folderFee)} />
          <Cell label="Kode Unik" value={formatRupiah(detail.uniqueCode)} />
          <Cell label="Total" value={formatRupiah(detail.totalAmount)} />
          <Cell
            label="Manual Check"
            value={detail.isManualCheckRequired ? "Ya, perlu cek manual" : "Tidak"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">File</h2>
        {detail.file ? (
          <div className="mt-4 space-y-3">
            <Cell label="Nama File Asli" value={detail.file.originalFilename} />
            <Cell label="Conversion Status" value={detail.file.conversionStatus} />

            <div className="flex flex-wrap gap-3">
              <a
                href={detail.file.storagePath}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download File Asli
              </a>
              {detail.file.convertedPdfPath ? (
                <a
                  href={detail.file.convertedPdfPath}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download PDF Hasil Konversi
                </a>
              ) : (
                <span className="rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-400">
                  PDF konversi belum tersedia
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Data file belum tersedia.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Update Status Manual</h2>
        <form action={updateStatusAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="orderDbId" value={detail.id} />
          <select
            name="nextStatus"
            defaultValue={detail.status}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value={ORDER_STATUS.MENUNGGU_VERIFIKASI}>menunggu_verifikasi</option>
            <option value={ORDER_STATUS.DITERIMA}>diterima</option>
            <option value={ORDER_STATUS.DITOLAK}>ditolak</option>
            <option value={ORDER_STATUS.DIPROSES}>diproses</option>
            <option value={ORDER_STATUS.SELESAI}>selesai</option>
          </select>
          <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
            Simpan Status
          </button>
        </form>
      </section>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
