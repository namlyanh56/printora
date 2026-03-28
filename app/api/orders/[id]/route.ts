import { NextRequest, NextResponse } from "next/server";
import { markOrderAsPaid, getOrderByPublicId, logOrderActivity } from "@/lib/order-management";
import { formatRupiah } from "@/lib/pricing";
import { fallbackWaSender, formatOrderNotificationMessage } from "@/lib/whatsapp";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // public order_id (PNRxxxxx)

    // existing flow: status -> menunggu_verifikasi
    const order = await markOrderAsPaid(id);

    // PATCH: trigger WA notification (non-blocking)
    try {
      const full = await getOrderByPublicId(id);
      if (full) {
        const message = formatOrderNotificationMessage({
          orderId: full.orderId,
          customerName: full.customerName,
          customerWhatsapp: full.customerWhatsapp,
          customerAddress: full.customerAddress,
          note: full.note,
          pageCount: full.pageCount,
          printTier: full.printTier,
          totalTransferText: formatRupiah(full.grandTotal),
          manualCheckRequired: full.manualCheckRequired,
        });

        await logOrderActivity({
          orderId: full.id,
          eventType: "wa_send_attempt",
          payload: { to: process.env.WA_ADMIN_TO ?? "wa2-admin", channel: "wa_sender_1" },
        });

        const sendRes = await fallbackWaSender.send({
          to: process.env.WA_ADMIN_TO ?? "wa2-admin",
          message,
          orderId: full.orderId,
        });

        if (sendRes.ok) {
          await logOrderActivity({
            orderId: full.id,
            eventType: "wa_send_success",
            payload: { messageId: sendRes.messageId ?? null },
          });
        } else {
          await logOrderActivity({
            orderId: full.id,
            eventType: "wa_send_failed",
            payload: { error: sendRes.error ?? "unknown" },
          });
        }
      }
    } catch (waErr) {
      // must not break payment flow
      console.error("[WA_NOTIFY_AFTER_PAY_FAILED]", waErr);
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark as paid." },
      { status: 400 }
    );
  }
}
