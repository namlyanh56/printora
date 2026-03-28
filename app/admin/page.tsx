import Link from "next/link";
import { getAdminOrderList, formatRupiah } from "@/lib/admin";

export default async function AdminDashboardPage() {
  const orders = await getAdminOrderList(100);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h1 className="text-base font-semibold text-gray-900">Orders</h1>
        <p className="text-xs text-gray-500">Pantau order secara cepat dari dashboard admin.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">Order ID</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                onClick={() => {
                  // progressive enhancement via link inside first cell
                }}
              >
                <td className="px-5 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-gray-900 hover:underline">
                    {o.orderId}
                  </Link>
                </td>
                <td className="px-5 py-3">{o.customerName}</td>
                <td className="px-5 py-3">{o.status}</td>
                <td className="px-5 py-3">{formatRupiah(o.totalAmount)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                  Belum ada order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
