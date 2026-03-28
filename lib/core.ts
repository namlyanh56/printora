import { z } from "zod";

/**
 * Core constants, shared types, and runtime-safe env parsing.
 * Disatukan agar domain inti tidak tersebar ke banyak file kecil.
 */

/* =========================
   Environment
========================= */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_NAME: z.string().default("Printora"),
  APP_URL: z.string().url().default("http://localhost:3000")
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL
});

/* =========================
   Order Status
========================= */

export const ORDER_STATUS = {
  DRAFT: "draft",
  AWAITING_PAYMENT: "awaiting_payment",
  WAITING_VERIFICATION: "waiting_verification",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/* =========================
   Pricing Config
========================= */

export const PRICING = {
  BW_PER_PAGE: 500,
  LIGHT_COLOR_PER_PAGE: 1000,
  FULL_COLOR_PER_PAGE: 1500,
  FOLDER_FEE: 500,
  UNIQUE_CODE_MIN: 1,
  UNIQUE_CODE_MAX: 400
} as const;

export const COLOR_CATEGORY = {
  BW: "bw",
  LIGHT_COLOR: "light_color",
  FULL_COLOR: "full_color",
  MIXED: "mixed",
  UNKNOWN: "unknown"
} as const;

export type ColorCategory = (typeof COLOR_CATEGORY)[keyof typeof COLOR_CATEGORY];

/* =========================
   Main Domain Types
========================= */

export type OrderCreateInput = {
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note?: string | null;
  pageCount: number;
  colorCategory: ColorCategory;
  isManualCheckRequired: boolean;
};

export type PricingBreakdown = {
  pageCount: number;
  colorCategory: ColorCategory;
  pricePerPage: number;
  pagesAmount: number;
  folderFee: number;
  uniqueCode: number;
  totalAmount: number;
};

export type OrderRecord = {
  id: string; // UUID from DB
  orderId: string; // PNRxxxxx
  customerName: string;
  customerAddress: string;
  customerWhatsapp: string;
  note: string | null;
  status: OrderStatus;
  pageCount: number;
  colorCategory: ColorCategory;
  isManualCheckRequired: boolean;
  pricePerPage: number;
  pagesAmount: number;
  folderFee: number;
  uniqueCode: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};