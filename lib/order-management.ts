import { db } from "@/lib/db";
import type { PoolClient } from "pg";
import { calculatePricing, type PrintTier } from "@/lib/pricing";

/** Single source of truth: order status + order id + create/pay/status updates */
export const ORDER_STATUS = {
  DRAFT: "draft",
  MENUNGGU_PEMBAYARAN: "menunggu_pembayaran",
  MENUNGGU_VERIFIKASI: "menunggu_verifikasi",
  DITERIMA: "diterima",
  DITOLAK: "ditolak",
  DIPROSES: "diproses",
  SELESAI: "selesai",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type OrderFileSnapshot = {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  isPdf: boolean;
  conversionStatus: "not_needed" | "pending" | "success" | "failed";
  analysisPageCount: number | null;
  analysisConfidence: number | null;
  manualCheckRequired: boolean;
  analysisNotes?: string[] | null;
};

export type CreateOrderInput = {
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note?: string | null;
  pageCount: number;
  printTier: PrintTier;
  file: OrderFileSnapshot;
  initialStatus?: OrderStatus;
};

export type OrderRecord = {
  id: string; // UUID
  orderId: string; // public ID, ex: PNR12345
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note: string | null;
  status: OrderStatus;
  manualCheckRequired: boolean;
  pageCount: number;
  printTier: PrintTier;
  pricePerPage: number;
  printSubtotal: number;
  folderFee: number;
  uniqueCode: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderLogEvent =
  | "order_created"
  | "file_analysis_saved"
  | "status_updated"
  | "payment_marked";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.MENUNGGU_PEMBAYARAN, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.MENUNGGU_PEMBAYARAN]: [ORDER_STATUS.MENUNGGU_VERIFIKASI, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.MENUNGGU_VERIFIKASI]: [ORDER_STATUS.DITERIMA, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.DITERIMA]: [ORDER_STATUS.DIPROSES, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.DITOLAK]: [],
  [ORDER_STATUS.DIPROSES]: [ORDER_STATUS.SELESAI, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.SELESAI]: [],
};

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionStatus(from, to)) {
    throw new Error(`Invalid order status transition: ${from} -> ${to}`);
  }
}

export function generateOrderId(prefix = "PNR"): string {
  const n = Math.floor(Math.random() * 100000);
  return `${prefix}${n.toString().padStart(5, "0")}`;
}

function toDbStatus(status: OrderStatus): string {
  switch (status) {
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
  }
}

function fromDbStatus(dbStatus: string): OrderStatus {
  switch (dbStatus) {
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
      return ORDER_STATUS.DRAFT;
  }
}

export async function logOrderActivity(params: {
  client?: PoolClient;
  orderId: string;
  eventType: OrderLogEvent;
  payload?: Record<string, unknown>;
}) {
  const exec = params.client ?? db;
  await exec.query(
    `INSERT INTO order_logs (order_id, event_type, event_payload) VALUES ($1,$2,$3::jsonb)`,
    [params.orderId, params.eventType, JSON.stringify(params.payload ?? {})]
  );
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const pricing = calculatePricing({
      pageCount: input.pageCount,
      printTier: input.printTier,
    });

    const status = input.initialStatus ?? ORDER_STATUS.MENUNGGU_PEMBAYARAN;
    const orderId = generateOrderId();

    const insert = await client.query(
      `
      INSERT INTO orders (
        order_id, customer_name, customer_address, customer_whatsapp, note, status,
        is_manual_check_required, page_count, color_category,
        price_per_page, pages_amount, folder_fee, unique_code, total_amount, analysis_confidence
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
      `,
      [
        orderId,
        input.customerName.trim(),
        input.customerAddress.trim(),
        input.customerWhatsapp.trim(),
        input.note?.trim() || null,
        toDbStatus(status),
        input.file.manualCheckRequired,
        pricing.pageCount,
        pricing.printTier,
        pricing.pricePerPage,
        pricing.printSubtotal,
        pricing.folderFee,
        pricing.uniqueCode,
        pricing.grandTotal,
        input.file.analysisConfidence,
      ]
    );

    const o = insert.rows[0];

    await client.query(
      `
      INSERT INTO order_files (
        order_id, original_filename, mime_type, size_bytes, storage_path,
        is_pdf, is_converted_to_pdf, conversion_status, file_hash
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        o.id,
        input.file.originalFilename,
        input.file.mimeType,
        input.file.sizeBytes,
        input.file.storagePath,
        input.file.isPdf,
        input.file.conversionStatus === "success",
        input.file.conversionStatus,
        null,
      ]
    );

    await logOrderActivity({
      client,
      orderId: o.id,
      eventType: "order_created",
      payload: { orderId: o.order_id, status, total: pricing.grandTotal },
    });

    await logOrderActivity({
      client,
      orderId: o.id,
      eventType: "file_analysis_saved",
      payload: {
        analysisPageCount: input.file.analysisPageCount,
        analysisConfidence: input.file.analysisConfidence,
        conversionStatus: input.file.conversionStatus,
      },
    });

    await client.query("COMMIT");

    return {
      id: o.id,
      orderId: o.order_id,
      customerName: o.customer_name,
      customerAddress: o.customer_address,
      customerWhatsapp: o.customer_whatsapp,
      note: o.note,
      status: fromDbStatus(o.status),
      manualCheckRequired: o.is_manual_check_required,
      pageCount: o.page_count,
      printTier: o.color_category,
      pricePerPage: o.price_per_page,
      printSubtotal: o.pages_amount,
      folderFee: o.folder_fee,
      uniqueCode: o.unique_code,
      grandTotal: o.total_amount,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function markOrderAsPaid(orderPublicId: string): Promise<OrderRecord> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const currentRes = await client.query(
      `SELECT * FROM orders WHERE order_id = $1 LIMIT 1`,
      [orderPublicId]
    );
    if (!currentRes.rowCount) throw new Error("Order not found.");

    const current = currentRes.rows[0];
    const from = fromDbStatus(current.status);
    const to = ORDER_STATUS.MENUNGGU_VERIFIKASI;
    assertStatusTransition(from, to);

    const updatedRes = await client.query(
      `
      UPDATE orders
      SET status = $1, paid_clicked_at = NOW()
      WHERE order_id = $2
      RETURNING *
      `,
      [toDbStatus(to), orderPublicId]
    );

    const o = updatedRes.rows[0];

    await logOrderActivity({
      client,
      orderId: o.id,
      eventType: "payment_marked",
      payload: { from, to, by: "customer_click" },
    });

    await client.query("COMMIT");

    return {
      id: o.id,
      orderId: o.order_id,
      customerName: o.customer_name,
      customerAddress: o.customer_address,
      customerWhatsapp: o.customer_whatsapp,
      note: o.note,
      status: fromDbStatus(o.status),
      manualCheckRequired: o.is_manual_check_required,
      pageCount: o.page_count,
      printTier: o.color_category,
      pricePerPage: o.price_per_page,
      printSubtotal: o.pages_amount,
      folderFee: o.folder_fee,
      uniqueCode: o.unique_code,
      grandTotal: o.total_amount,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getOrderByPublicId(orderPublicId: string): Promise<OrderRecord | null> {
  const res = await db.query(`SELECT * FROM orders WHERE order_id = $1 LIMIT 1`, [orderPublicId]);
  if (!res.rowCount) return null;
  const o = res.rows[0];
  return {
    id: o.id,
    orderId: o.order_id,
    customerName: o.customer_name,
    customerAddress: o.customer_address,
    customerWhatsapp: o.customer_whatsapp,
    note: o.note,
    status: fromDbStatus(o.status),
    manualCheckRequired: o.is_manual_check_required,
    pageCount: o.page_count,
    printTier: o.color_category,
    pricePerPage: o.price_per_page,
    printSubtotal: o.pages_amount,
    folderFee: o.folder_fee,
    uniqueCode: o.unique_code,
    grandTotal: o.total_amount,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}
