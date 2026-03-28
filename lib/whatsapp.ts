/**
 * Printora WhatsApp Integration (concept + core logic in one compact file)
 * - message formatter
 * - reply parser
 * - connection state model
 * - monitoring snapshot helpers
 */

export const WA_COMMAND = {
  ACCEPT: "Y",
  REJECT: "N",
} as const;

export type WaAction = "accept" | "reject";

export type ParsedAdminCommand =
  | { ok: true; action: WaAction; orderId: string; raw: string }
  | { ok: false; reason: string; raw: string };

export function parseAdminReply(rawInput: string): ParsedAdminCommand {
  const raw = (rawInput ?? "").trim().toUpperCase();

  // Support spaces around '#', still strict command
  // Valid examples: Y#PNR28829, N#PNR12345
  const match = raw.match(/^([YN])\s*#\s*([A-Z0-9-]{4,24})$/);
  if (!match) {
    return {
      ok: false,
      reason: "Format command tidak valid. Gunakan Y#ORDERID atau N#ORDERID",
      raw: rawInput,
    };
  }

  const symbol = match[1];
  const orderId = match[2];

  return {
    ok: true,
    action: symbol === WA_COMMAND.ACCEPT ? "accept" : "reject",
    orderId,
    raw: rawInput,
  };
}

/* =========================
   Message Formatting
========================= */

export type WaOrderMessageInput = {
  orderId: string;
  customerName: string;
  customerWhatsapp: string;
  customerAddress: string;
  fileLabel: string; // e.g. "proposal.pdf (PDF)" or "dokumen.docx (Non-PDF)"
  pageCount: number | null;
  totalTransferText: string; // e.g. "Rp24.612"
  statusLabel: string; // e.g. "menunggu_verifikasi"
};

export function formatOrderNotificationMessage(input: WaOrderMessageInput): string {
  const acceptCmd = `Y#${input.orderId}`;
  const rejectCmd = `N#${input.orderId}`;

  return [
    "📌 *ORDER BARU — Printora*",
    `Order ID: *${input.orderId}*`,
    `Nama: ${input.customerName}`,
    `WhatsApp: ${input.customerWhatsapp}`,
    `Alamat: ${input.customerAddress}`,
    `File: ${input.fileLabel}`,
    `Halaman: ${input.pageCount ?? "-"}`,
    `Total Transfer: ${input.totalTransferText}`,
    `Status: ${input.statusLabel}`,
    "",
    "Balas command:",
    `Terima: \`${acceptCmd}\``,
    `Tolak : \`${rejectCmd}\``,
  ].join("\n");
}

/* =========================
   Connection/Monitoring Model
========================= */

export const WA_CONNECTION_STATUS = {
  ACTIVE: "active",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  RECONNECT_REQUIRED: "reconnect_required",
} as const;

export type WaConnectionStatus =
  (typeof WA_CONNECTION_STATUS)[keyof typeof WA_CONNECTION_STATUS];

export type WaConnectionState = {
  channelName: "wa_sender_1";
  status: WaConnectionStatus;
  lastSeenAt: string | null; // ISO
  lastError: string | null;
  reconnectAttempts: number;
  updatedAt: string; // ISO
};

export type WaDeliveryLog = {
  orderId: string;
  targetWa: string; // WA2
  status: "queued" | "sent" | "failed";
  messageId?: string | null;
  error?: string | null;
  createdAt: string;
};

/* =========================
   Monitoring Snapshot for Admin
========================= */

export type WaMonitoringSnapshot = {
  senderStatus: WaConnectionState;
  pendingFailedDeliveries: number;
  lastFailedAt: string | null;
  recommendation:
    | "normal"
    | "check_connection"
    | "reconnect_now"
    | "use_dashboard_fallback";
};

export function buildWaMonitoringSnapshot(params: {
  senderStatus: WaConnectionState;
  pendingFailedDeliveries: number;
  lastFailedAt: string | null;
}): WaMonitoringSnapshot {
  const { senderStatus, pendingFailedDeliveries, lastFailedAt } = params;

  let recommendation: WaMonitoringSnapshot["recommendation"] = "normal";

  if (senderStatus.status === WA_CONNECTION_STATUS.ERROR) {
    recommendation = "use_dashboard_fallback";
  } else if (senderStatus.status === WA_CONNECTION_STATUS.RECONNECT_REQUIRED) {
    recommendation = "reconnect_now";
  } else if (senderStatus.status === WA_CONNECTION_STATUS.DISCONNECTED) {
    recommendation = "check_connection";
  } else if (pendingFailedDeliveries > 0) {
    recommendation = "check_connection";
  }

  return {
    senderStatus,
    pendingFailedDeliveries,
    lastFailedAt,
    recommendation,
  };
}
