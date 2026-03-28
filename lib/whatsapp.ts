/**
 * Printora WhatsApp Integration (compact single-domain file)
 * - message formatter
 * - reply parser
 * - connection state model
 * - monitoring snapshot helpers
 * - pragmatic sender abstraction (fallback logging)
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
  note: string | null;
  pageCount: number;
  printTier: string;
  totalTransferText: string;
  manualCheckRequired: boolean;
};

export function formatOrderNotificationMessage(input: WaOrderMessageInput): string {
  const acceptCmd = `Y#${input.orderId}`;
  const rejectCmd = `N#${input.orderId}`;

  return [
    "📌 *ORDER MENUNGGU VERIFIKASI — Printora*",
    `Order ID: *${input.orderId}*`,
    `Nama: ${input.customerName}`,
    `WA Customer: ${input.customerWhatsapp}`,
    `Alamat: ${input.customerAddress}`,
    `Catatan: ${input.note?.trim() ? input.note : "-"}`,
    `Halaman: ${input.pageCount}`,
    `Tier Print: ${input.printTier}`,
    `Total Transfer: ${input.totalTransferText}`,
    `Manual Check: ${input.manualCheckRequired ? "YA" : "TIDAK"}`,
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
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
} as const;

export type WaConnectionStatus =
  (typeof WA_CONNECTION_STATUS)[keyof typeof WA_CONNECTION_STATUS];

export type WaConnectionState = {
  channelName: "wa_sender_1";
  status: WaConnectionStatus;
  lastError: string | null;
  lastActivityAt: string | null;
};

export type WaDeliveryLog = {
  orderId: string;
  targetWa: string;
  status: "queued" | "sent" | "failed";
  messageId?: string | null;
  error?: string | null;
  createdAt: string;
};

/* =========================
   In-memory monitor state (MVP pragmatic)
========================= */

let connectionState: WaConnectionState = {
  channelName: "wa_sender_1",
  status: WA_CONNECTION_STATUS.DISCONNECTED,
  lastError: null,
  lastActivityAt: null,
};

export function getWaConnectionState(): WaConnectionState {
  return { ...connectionState };
}

export function setWaConnectionState(next: Partial<WaConnectionState>): WaConnectionState {
  connectionState = {
    ...connectionState,
    ...next,
    lastActivityAt: next.lastActivityAt ?? new Date().toISOString(),
  };
  return { ...connectionState };
}

/* =========================
   Sender abstraction
========================= */

export type SendWaPayload = {
  to: string;
  message: string;
  orderId: string;
};

export type SendWaResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export interface WaSender {
  send(payload: SendWaPayload): Promise<SendWaResult>;
}

/**
 * Default sender for MVP:
 * - no real connector yet
 * - logs payload
 * - returns failed or success based on env flag
 */
export const fallbackWaSender: WaSender = {
  async send(payload) {
    const simulateConnected = process.env.WA_SIMULATE_CONNECTED === "1";

    if (!simulateConnected) {
      setWaConnectionState({
        status: WA_CONNECTION_STATUS.DISCONNECTED,
        lastError: "WA connector not configured",
        lastActivityAt: new Date().toISOString(),
      });
      console.error("[WA:FALLBACK:SEND_FAILED]", payload);
      return { ok: false, error: "WA connector not configured" };
    }

    const fakeMessageId = `wa-${Date.now()}`;
    setWaConnectionState({
      status: WA_CONNECTION_STATUS.CONNECTED,
      lastError: null,
      lastActivityAt: new Date().toISOString(),
    });
    console.info("[WA:FALLBACK:SEND_OK]", { ...payload, messageId: fakeMessageId });
    return { ok: true, messageId: fakeMessageId };
  },
};
