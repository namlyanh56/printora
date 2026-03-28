import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, ORDER_STATUS } from "@/lib/order-management";
import { decidePrintTier } from "@/lib/pricing";

const schema = z.object({
  customerName: z.string().min(2),
  customerAddress: z.string().min(5),
  customerWhatsapp: z.string().min(8),
  note: z.string().optional().nullable(),
  pageCount: z.number().int().min(1),

  file: z.object({
    originalFilename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    storagePath: z.string().min(1),
    isPdf: z.boolean(),
    conversionStatus: z.enum(["not_needed", "pending", "success", "failed"]),
    analysisPageCount: z.number().int().min(1).nullable(),
    analysisConfidence: z.number().min(0).max(1).nullable(),
    manualCheckRequired: z.boolean(),
    analysisNotes: z.array(z.string()).optional().nullable(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const printTier = decidePrintTier(body.file.analysisNotes);

    const order = await createOrder({
      customerName: body.customerName,
      customerAddress: body.customerAddress,
      customerWhatsapp: body.customerWhatsapp,
      note: body.note ?? null,
      pageCount: body.pageCount,
      printTier,
      file: body.file,
      initialStatus: ORDER_STATUS.MENUNGGU_PEMBAYARAN,
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create order failed." },
      { status: 400 }
    );
  }
}
