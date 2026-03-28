import crypto from "crypto";
import {
  COLOR_CATEGORY,
  type ColorCategory,
  PRICING,
  ORDER_STATUS,
  type OrderStatus,
  type PricingBreakdown
} from "@/lib/core";

/**
 * Domain utilities untuk order:
 * - status guard
 * - pricing
 * - order ID generator
 * - payment unique code generator
 */

/* =========================
   Status Rules (simple FSM)
========================= */

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.DRAFT]: [ORDER_STATUS.AWAITING_PAYMENT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.AWAITING_PAYMENT]: [ORDER_STATUS.WAITING_VERIFICATION, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.WAITING_VERIFICATION]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.REJECTED,
    ORDER_STATUS.CANCELLED
  ],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

export function canTransitionStatus(from: OrderStatus, to: OrderStatus): boolean {
  return allowedTransitions[from].includes(to);
}

/* =========================
   Pricing
========================= */

export function resolvePricePerPage(colorCategory: ColorCategory): number {
  switch (colorCategory) {
    case COLOR_CATEGORY.BW:
      return PRICING.BW_PER_PAGE;
    case COLOR_CATEGORY.LIGHT_COLOR:
      return PRICING.LIGHT_COLOR_PER_PAGE;
    case COLOR_CATEGORY.FULL_COLOR:
      return PRICING.FULL_COLOR_PER_PAGE;
    case COLOR_CATEGORY.MIXED:
      // MVP policy: mixed => pakai tier aman (full_color) agar tidak undercharge
      return PRICING.FULL_COLOR_PER_PAGE;
    case COLOR_CATEGORY.UNKNOWN:
    default:
      // unknown => fallback konservatif + manual check
      return PRICING.FULL_COLOR_PER_PAGE;
  }
}

export function generatePaymentUniqueCode(): number {
  // Range kecil 1..400 sesuai requirement
  return crypto.randomInt(PRICING.UNIQUE_CODE_MIN, PRICING.UNIQUE_CODE_MAX + 1);
}

export function calculatePricing(params: {
  pageCount: number;
  colorCategory: ColorCategory;
  uniqueCode?: number;
}): PricingBreakdown {
  const safePageCount = Math.max(1, Math.floor(params.pageCount));
  const pricePerPage = resolvePricePerPage(params.colorCategory);
  const pagesAmount = safePageCount * pricePerPage;
  const folderFee = PRICING.FOLDER_FEE;
  const uniqueCode = params.uniqueCode ?? generatePaymentUniqueCode();
  const totalAmount = pagesAmount + folderFee + uniqueCode;

  return {
    pageCount: safePageCount,
    colorCategory: params.colorCategory,
    pricePerPage,
    pagesAmount,
    folderFee,
    uniqueCode,
    totalAmount
  };
}

/* =========================
   Order ID
========================= */

export function generateOrderId(prefix = "PNR"): string {
  // 5 digit random numeric (00000 - 99999)
  // contoh: PNR28829
  const n = crypto.randomInt(0, 100000);
  return `${prefix}${n.toString().padStart(5, "0")}`;
}