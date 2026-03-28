import { db } from "@/lib/db";
import type { PoolClient } from "pg";

/**
 * Printora Order Management System (compact single-domain file)
 * Covers:
 * 1) data model types
 * 2) order status constants
 * 3) safe transition helper
 * 4) create order
 * 5) update order status
 * 6) simple activity logging
 */

/* =========================================================
   1) CORE DATA MODEL TYPES
========================================================= */

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

export type OrderPricingSnapshot = {
  pageCount: number;
  printTier: "bw" | "light_color" | "full_color";
  pricePerPage: number;
  printSubtotal: number;
  folderFee: number;
  uniqueCode: number;
  grandTotal: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note?: string | null;

  file: OrderFileSnapshot;
  pricing: OrderPricingSnapshot;

  initialStatus?: OrderStatus;
};

export type OrderRecord = {
  id: string;
  orderId: string;

  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note: string | null;

  status: OrderStatus;
  manualCheckRequired: boolean;

  pageCount: number;
  printTier: "bw" | "light_color" | "full_color";
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
  | "status_updated"
  | "payment_marked"
  | "file_analysis_saved"
  | "admin_note_updated";

/* =========================================================
   2) STATUS TRANSITION RULES
========================================================= */

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.MENUNGGU_PEMBAYARAN, ORDER_STATUS.DITOLAK],
  [ORDER_STATUS.MENUNGGU_PEMBAYARAN]: [
    ORDER_STATUS.MENUNGGU_VERIFIKASI,
    ORDER_STATUS.DITOLAK,
  ],
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

/* =========================================================
   3) ORDER ID GENERATOR
========================================================= */

export function generateOrderId(prefix = "PNR"): string {
  const n = Math.floor(Math.random() * 100000);
  return `${prefix}${n.toString().padStart(5, "0")}`;
}

/* =========================================================
   4) SIMPLE LOGGING
========================================================= */

export async function logOrderActivity(params: {
  client?: PoolClient;
  orderId: string; // UUID
  eventType: OrderLogEvent;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const executor = params.client ?? db;
  await executor.query(
    `
      INSERT INTO order_logs (order_id, event_type, event_payload)
      VALUES ($1, $2, $3::jsonb)
    `,
    [params.orderId, params.eventType, JSON.stringify(params.payload ?? {})]
  );
}

/* =========================================================
   5) CREATE ORDER
========================================================= */

function toDbStatus(status: OrderStatus): string {
  // Map app status ke enum db lama (jika masih pakai schema lama)
  // Jika nanti enum db sudah pakai nama Indonesia, mapping bisa disederhanakan.
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

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const status = input.initialStatus ?? ORDER_STATUS.MENUNGGU_PEMBAYARAN;
    const orderId = generateOrderId();

    const insertOrderRes = await client.query(
      `
        INSERT INTO orders (
          order_id,
          customer_name,
          customer_address,
          customer_whatsapp,
          note,
          status,
          is_manual_check_required,
          page_count,
          color_category,
          price_per_page,
          pages_amount,
          folder_fee,
          unique_code,
          total_amount,
          analysis_confidence
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        RETURNING
          id, order_id, customer_name, customer_address, customer_whatsapp, note,
          status, is_manual_check_required, page_count, color_category, price_per_page,
          pages_amount, folder_fee, unique_code, total_amount, created_at, updated_at
      `,
      [
        orderId,
        input.customerName.trim(),
        input.customerAddress.trim(),
        input.customerWhatsapp.trim(),
        input.note?.trim() || null,
        toDbStatus(status),
        input.file.manualCheckRequired,
        input.pricing.pageCount,
        input.pricing.printTier,
        input.pricing.pricePerPage,
        input.pricing.printSubtotal,
        input.pricing.folderFee,
        input.pricing.uniqueCode,
        input.pricing.grandTotal,
        input.file.analysisConfidence,
      ]
    );

    const row = insertOrderRes.rows[0] as {
      id: string;
      order_id: string;
      customer_name: string;
      customer_address: string;
      customer_whatsapp: string;
      note: string | null;
      status: string;
      is_manual_check_required: boolean;
      page_count: number;
      color_category: "bw" | "light_color" | "full_color";
      price_per_page: number;
      pages_amount: number;
      folder_fee: number;
      unique_code: number;
      total_amount: number;
      created_at: string;
      updated_at: string;
    };

    await client.query(
      `
        INSERT INTO order_files (
          order_id,
          original_filename,
          mime_type,
          size_bytes,
          storage_path,
          is_pdf,
          is_converted_to_pdf,
          conversion_status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        row.id,
        input.file.originalFilename,
        input.file.mimeType,
        input.file.sizeBytes,
        input.file.storagePath,
        input.file.isPdf,
        input.file.conversionStatus === "success",
        input.file.conversionStatus,
      ]
    );

    await logOrderActivity({
      client,
      orderId: row.id,
      eventType: "order_created",
      payload: {
        orderId: row.order_id,
        status,
        manualCheckRequired: input.file.manualCheckRequired,
        pageCount: input.pricing.pageCount,
        grandTotal: input.pricing.grandTotal,
      },
    });

    await logOrderActivity({
      client,
      orderId: row.id,
      eventType: "file_analysis_saved",
      payload: {
        analysisPageCount: input.file.analysisPageCount,
        analysisConfidence: input.file.analysisConfidence,
        analysisNotes: input.file.analysisNotes ?? [],
        conversionStatus: input.file.conversionStatus,
      },
    });

    await client.query("COMMIT");

    return {
      id: row.id,
      orderId: row.order_id,
      customerName: row.customer_name,
      customerAddress: row.customer_address,
      customerWhatsapp: row.customer_whatsapp,
      note: row.note,
      status: fromDbStatus(row.status),
      manualCheckRequired: row.is_manual_check_required,
      pageCount: row.page_count,
      printTier: row.color_category,
      pricePerPage: row.price_per_page,
      printSubtotal: row.pages_amount,
      folderFee: row.folder_fee,
      uniqueCode: row.unique_code,
      grandTotal: row.total_amount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   6) UPDATE ORDER STATUS
========================================================= */

export async function updateOrderStatus(params: {
  orderId: string; // UUID
  nextStatus: OrderStatus;
  actor?: "system" | "admin";
  note?: string;
}): Promise<OrderRecord> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const currentRes = await client.query(
      `
        SELECT
          id, order_id, customer_name, customer_address, customer_whatsapp, note,
          status, is_manual_check_required, page_count, color_category, price_per_page,
          pages_amount, folder_fee, unique_code, total_amount, created_at, updated_at
        FROM orders
        WHERE id = $1
        LIMIT 1
      `,
      [params.orderId]
    );

    if (currentRes.rowCount === 0) {
      throw new Error("Order not found.");
    }

    const current = currentRes.rows[0] as {
      id: string;
      order_id: string;
      customer_name: string;
      customer_address: string;
      customer_whatsapp: string;
      note: string | null;
      status: string;
      is_manual_check_required: boolean;
      page_count: number;
      color_category: "bw" | "light_color" | "full_color";
      price_per_page: number;
      pages_amount: number;
      folder_fee: number;
      unique_code: number;
      total_amount: number;
      created_at: string;
      updated_at: string;
    };

    const fromStatus = fromDbStatus(current.status);
    assertStatusTransition(fromStatus, params.nextStatus);

    const updateRes = await client.query(
      `
        UPDATE orders
        SET status = $1
        WHERE id = $2
        RETURNING
          id, order_id, customer_name, customer_address, customer_whatsapp, note,
          status, is_manual_check_required, page_count, color_category, price_per_page,
          pages_amount, folder_fee, unique_code, total_amount, created_at, updated_at
      `,
      [toDbStatus(params.nextStatus), params.orderId]
    );

    const updated = updateRes.rows[0] as typeof current;

    await logOrderActivity({
      client,
      orderId: updated.id,
      eventType: "status_updated",
      payload: {
        from: fromStatus,
        to: params.nextStatus,
        actor: params.actor ?? "system",
        note: params.note ?? null,
      },
    });

    await client.query("COMMIT");

    return {
      id: updated.id,
      orderId: updated.order_id,
      customerName: updated.customer_name,
      customerAddress: updated.customer_address,
      customerWhatsapp: updated.customer_whatsapp,
      note: updated.note,
      status: fromDbStatus(updated.status),
      manualCheckRequired: updated.is_manual_check_required,
      pageCount: updated.page_count,
      printTier: updated.color_category,
      pricePerPage: updated.price_per_page,
      printSubtotal: updated.pages_amount,
      folderFee: updated.folder_fee,
      uniqueCode: updated.unique_code,
      grandTotal: updated.total_amount,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
