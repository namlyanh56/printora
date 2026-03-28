import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/order-management";
import { getWaConnectionState } from "@/lib/whatsapp";

const ADMIN_COOKIE = "printora_admin_session";
const ADMIN_TOKEN = "printora-admin-local";

export type AdminOrderListItem = {
  id: string;
  orderId: string;
  customerName: string;
  customerWhatsapp: string;
  status: string;
  totalAmount: number;
  isManualCheckRequired: boolean;
  createdAt: string;
};

export type AdminOverview = {
  total: number;
  menungguVerifikasi: number;
  diterima: number;
  ditolak: number;
  diproses: number;
};

export type AdminOrderDetail = {
  id: string;
  orderId: string;
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note: string | null;
  status: string;
  isManualCheckRequired: boolean;
  pageCount: number;
  colorCategory: string;
  pricePerPage: number;
  pagesAmount: number;
  folderFee: number;
  uniqueCode: number;
  totalAmount: number;
  createdAt: string;
  file: {
    originalFilename: string;
    storagePath: string;
    convertedPdfPath: string | null;
    isPdf: boolean;
    conversionStatus: string;
  } | null;
};

export type WhatsAppMonitor = {
  senderStatus: "connected" | "disconnected";
  lastActivityAt: string | null;
  lastError: string | null;
  failedQueue: number;
};

function mapDbStatusToLabel(status: string): string {
  switch (status) {
    case "draft":
      return ORDER_STATUS.DRAFT;
    case "awaiting_payment":
      return ORDER_STATUS.MENUNGGU_PEMBAYARAN;
    case "waiting_verification":
      return ORDER_STATUS.MENUNGGU_VERIFIKASI;
    case "accepted":
      return ORDER_STATUS.DITERIMA;
    case "rejected":
      return ORDER_STATUS.DITOLAK;
    case "processing":
      return ORDER_STATUS.DIPROSES;
    case "completed":
      return ORDER_STATUS.SELESAI;
    default:
      return status;
  }
}

function mapLabelToDbStatus(label: string): string {
  switch (label) {
    case ORDER_STATUS.DRAFT:
      return "draft";
    case ORDER_STATUS.MENUNGGU_PEMBAYARAN:
      return "awaiting_payment";
    case ORDER_STATUS.MENUNGGU_VERIFIKASI:
      return "waiting_verification";
    case ORDER_STATUS.DITERIMA:
      return "accepted";
    case ORDER_STATUS.DITOLAK:
      return "rejected";
    case ORDER_STATUS.DIPROSES:
      return "processing";
    case ORDER_STATUS.SELESAI:
      return "completed";
    default:
      return "draft";
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === ADMIN_TOKEN;
}

export async function requireAdminAuth(): Promise<void> {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/admin/login");
}

export async function adminLogin(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD ?? "admin123";
  if (password !== expected) return false;

  const c = await cookies();
  c.set(ADMIN_COOKIE, ADMIN_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export async function adminLogout(): Promise<void> {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await db.query(`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'waiting_verification')::int as menunggu_verifikasi,
      COUNT(*) FILTER (WHERE status = 'accepted')::int as diterima,
      COUNT(*) FILTER (WHERE status = 'rejected')::int as ditolak,
      COUNT(*) FILTER (WHERE status = 'processing')::int as diproses
    FROM orders
  `);

  const r = res.rows[0];
  return {
    total: r.total ?? 0,
    menungguVerifikasi: r.menunggu_verifikasi ?? 0,
    diterima: r.diterima ?? 0,
    ditolak: r.ditolak ?? 0,
    diproses: r.diproses ?? 0,
  };
}

export async function getAdminOrderList(limit = 50): Promise<AdminOrderListItem[]> {
  const res = await db.query(
    `
    SELECT id, order_id, customer_name, customer_whatsapp, status,
           total_amount, is_manual_check_required, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT $1
  `,
    [limit]
  );

  return res.rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    customerName: r.customer_name,
    customerWhatsapp: r.customer_whatsapp,
    status: mapDbStatusToLabel(r.status),
    totalAmount: r.total_amount,
    isManualCheckRequired: r.is_manual_check_required,
    createdAt: r.created_at,
  }));
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const orderRes = await db.query(
    `
    SELECT
      id, order_id, customer_name, customer_address, customer_whatsapp, note, status,
      is_manual_check_required, page_count, color_category, price_per_page, pages_amount,
      folder_fee, unique_code, total_amount, created_at
    FROM orders
    WHERE id = $1
    LIMIT 1
  `,
    [orderId]
  );
  if (!orderRes.rowCount) return null;

  const o = orderRes.rows[0];
  const fileRes = await db.query(
    `
    SELECT
      original_filename, storage_path, converted_pdf_path, is_pdf, conversion_status
    FROM order_files
    WHERE order_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [orderId]
  );

  return {
    id: o.id,
    orderId: o.order_id,
    customerName: o.customer_name,
    customerAddress: o.customer_address,
    customerWhatsapp: o.customer_whatsapp,
    note: o.note,
    status: mapDbStatusToLabel(o.status),
    isManualCheckRequired: o.is_manual_check_required,
    pageCount: o.page_count,
    colorCategory: o.color_category,
    pricePerPage: o.price_per_page,
    pagesAmount: o.pages_amount,
    folderFee: o.folder_fee,
    uniqueCode: o.unique_code,
    totalAmount: o.total_amount,
    createdAt: o.created_at,
    file: fileRes.rowCount
      ? {
          originalFilename: fileRes.rows[0].original_filename,
          storagePath: fileRes.rows[0].storage_path,
          convertedPdfPath: fileRes.rows[0].converted_pdf_path,
          isPdf: fileRes.rows[0].is_pdf,
          conversionStatus: fileRes.rows[0].conversion_status,
        }
      : null,
  };
}

export async function adminUpdateOrderStatus(input: {
  orderDbId: string;
  nextStatusLabel: string;
  actor?: string;
}): Promise<void> {
  const nextDbStatus = mapLabelToDbStatus(input.nextStatusLabel);

  await db.query(`UPDATE orders SET status = $1 WHERE id = $2`, [nextDbStatus, input.orderDbId]);

  await db.query(
    `
    INSERT INTO order_logs (order_id, event_type, event_payload)
    VALUES ($1, 'status_updated', $2::jsonb)
  `,
    [
      input.orderDbId,
      JSON.stringify({
        nextStatus: input.nextStatusLabel,
        actor: input.actor ?? "admin",
        source: "dashboard_manual",
      }),
    ]
  );
}

export async function getWhatsAppMonitor(): Promise<WhatsAppMonitor> {
  const conn = getWaConnectionState();

  const failRes = await db.query(`
    SELECT COUNT(*)::int AS failed_queue
    FROM order_logs
    WHERE event_type = 'wa_send_failed'
  `);

  return {
    senderStatus: conn.status,
    lastActivityAt: conn.lastActivityAt,
    lastError: conn.lastError,
    failedQueue: failRes.rows[0]?.failed_queue ?? 0,
  };
}

export async function triggerFallbackQueueProcessing(): Promise<number> {
  const res = await db.query(`
    SELECT COUNT(*)::int AS failed_queue
    FROM order_logs
    WHERE event_type = 'wa_send_failed'
  `);
  return res.rows[0]?.failed_queue ?? 0;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
