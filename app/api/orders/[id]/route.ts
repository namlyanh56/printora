import { NextRequest, NextResponse } from "next/server";
import { getOrderByPublicId } from "@/lib/order-management";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrderByPublicId(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}
