import crypto from "crypto";

/**
 * Printora Pricing System (compact single-domain file)
 * - Deterministic and testable pure functions
 * - Clear output for customer UI and admin dashboard
 */

/* =========================================================
   CONSTANTS
========================================================= */

export const PRINT_PRICING = {
  BW_PER_PAGE: 500,
  LIGHT_COLOR_PER_PAGE: 1000,
  FULL_COLOR_PER_PAGE: 1500,
  FOLDER_FEE: 500,
  UNIQUE_CODE_MIN: 1,
  UNIQUE_CODE_MAX: 400,
} as const;

export const PRINT_TIER = {
  BW: "bw",
  LIGHT_COLOR: "light_color",
  FULL_COLOR: "full_color",
} as const;

export type PrintTier = (typeof PRINT_TIER)[keyof typeof PRINT_TIER];

/* =========================================================
   PATCH: tier decision moved from API route to domain layer
========================================================= */

export function decidePrintTier(notes?: string[] | null): PrintTier {
  if (!notes) return PRINT_TIER.BW;

  const text = notes.join(" ").toLowerCase();

  if (text.includes("full")) return PRINT_TIER.FULL_COLOR;
  if (text.includes("color")) return PRINT_TIER.LIGHT_COLOR;

  return PRINT_TIER.BW;
}

/* =========================================================
   TYPES (analysis -> pricing)
========================================================= */

export type PageAnalysisSummary = {
  pageCount: number;
  printTier: PrintTier;
  manualCheckRequired?: boolean | null;
  analysisConfidence?: number | null;
};

export type PricingInput = {
  pageCount: number;
  printTier: PrintTier;
  uniqueCode?: number;
};

export type PricingBreakdown = {
  currency: "IDR";
  pageCount: number;
  printTier: PrintTier;
  pricePerPage: number;
  printSubtotal: number;
  folderFee: number;
  uniqueCode: number;
  grandTotal: number;
  lineItems: Array<{
    key: "print_subtotal" | "folder_fee" | "unique_code" | "grand_total";
    label: string;
    amount: number;
    formula?: string;
  }>;
};

export type AdminPricingView = {
  tierLabel: "Hitam Putih" | "Warna Ringan" | "Warna Penuh";
  pageCount: number;
  pricePerPage: number;
  printSubtotal: number;
  folderFee: number;
  uniqueCode: number;
  grandTotal: number;
};

export type CustomerPricingView = {
  summaryTitle: "Order Summary";
  totalLabel: "Total Transfer";
  formatted: {
    printSubtotal: string;
    folderFee: string;
    uniqueCode: string;
    grandTotal: string;
  };
};

/* =========================================================
   UTILITIES
========================================================= */

export function resolvePricePerPage(printTier: PrintTier): number {
  switch (printTier) {
    case PRINT_TIER.BW:
      return PRINT_PRICING.BW_PER_PAGE;
    case PRINT_TIER.LIGHT_COLOR:
      return PRINT_PRICING.LIGHT_COLOR_PER_PAGE;
    case PRINT_TIER.FULL_COLOR:
      return PRINT_PRICING.FULL_COLOR_PER_PAGE;
    default: {
      const _never: never = printTier;
      throw new Error(`Unknown print tier: ${String(_never)}`);
    }
  }
}

export function generateUniqueCode(
  min: number = PRINT_PRICING.UNIQUE_CODE_MIN,
  max: number = PRINT_PRICING.UNIQUE_CODE_MAX
): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    throw new Error("Invalid unique code range.");
  }
  return crypto.randomInt(min, max + 1);
}

export function sanitizePageCount(pageCount: number): number {
  if (!Number.isFinite(pageCount)) return 1;
  return Math.max(1, Math.floor(pageCount));
}

export function validateUniqueCode(uniqueCode: number): number {
  if (!Number.isInteger(uniqueCode)) {
    throw new Error("Unique code must be an integer.");
  }
  if (
    uniqueCode < PRINT_PRICING.UNIQUE_CODE_MIN ||
    uniqueCode > PRINT_PRICING.UNIQUE_CODE_MAX
  ) {
    throw new Error(
      `Unique code must be between ${PRINT_PRICING.UNIQUE_CODE_MIN} and ${PRINT_PRICING.UNIQUE_CODE_MAX}.`
    );
  }
  return uniqueCode;
}

/* =========================================================
   CORE CALCULATOR
========================================================= */

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const safePageCount = sanitizePageCount(input.pageCount);
  const pricePerPage = resolvePricePerPage(input.printTier);
  const printSubtotal = safePageCount * pricePerPage;
  const folderFee = PRINT_PRICING.FOLDER_FEE;

  const uniqueCode =
    input.uniqueCode === undefined
      ? generateUniqueCode()
      : validateUniqueCode(input.uniqueCode);

  const grandTotal = printSubtotal + folderFee + uniqueCode;

  return {
    currency: "IDR",
    pageCount: safePageCount,
    printTier: input.printTier,
    pricePerPage,
    printSubtotal,
    folderFee,
    uniqueCode,
    grandTotal,
    lineItems: [
      {
        key: "print_subtotal",
        label: "Subtotal print",
        amount: printSubtotal,
        formula: `${safePageCount} × ${formatRupiah(pricePerPage)}`,
      },
      {
        key: "folder_fee",
        label: "Biaya map dokumen",
        amount: folderFee,
      },
      {
        key: "unique_code",
        label: "Kode unik pembayaran",
        amount: uniqueCode,
      },
      {
        key: "grand_total",
        label: "Total transfer",
        amount: grandTotal,
      },
    ],
  };
}

/* =========================================================
   ADAPTERS (UI/Admin ready)
========================================================= */

export function toAdminPricingView(b: PricingBreakdown): AdminPricingView {
  return {
    tierLabel: mapTierLabel(b.printTier),
    pageCount: b.pageCount,
    pricePerPage: b.pricePerPage,
    printSubtotal: b.printSubtotal,
    folderFee: b.folderFee,
    uniqueCode: b.uniqueCode,
    grandTotal: b.grandTotal,
  };
}

export function toCustomerPricingView(b: PricingBreakdown): CustomerPricingView {
  return {
    summaryTitle: "Order Summary",
    totalLabel: "Total Transfer",
    formatted: {
      printSubtotal: formatRupiah(b.printSubtotal),
      folderFee: formatRupiah(b.folderFee),
      uniqueCode: formatRupiah(b.uniqueCode),
      grandTotal: formatRupiah(b.grandTotal),
    },
  };
}

/* =========================================================
   BRIDGE from file analysis result
========================================================= */

export function pricingInputFromAnalysis(a: PageAnalysisSummary): PricingInput {
  return {
    pageCount: sanitizePageCount(a.pageCount),
    printTier: a.printTier,
  };
}

/* =========================================================
   PRESENTATION HELPERS
========================================================= */

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function mapTierLabel(tier: PrintTier): AdminPricingView["tierLabel"] {
  switch (tier) {
    case PRINT_TIER.BW:
      return "Hitam Putih";
    case PRINT_TIER.LIGHT_COLOR:
      return "Warna Ringan";
    case PRINT_TIER.FULL_COLOR:
      return "Warna Penuh";
    default: {
      const _never: never = tier;
      throw new Error(`Unknown tier: ${String(_never)}`);
    }
  }
}
