import { NextRequest, NextResponse } from "next/server";
import { markOrderAsPaid } from "@/lib/order-management";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // public order_id (PNRxxxxx)
    const order = await markOrderAsPaid(id);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark as paid." },
      { status: 400 }
    );
  }
}
