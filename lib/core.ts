import { z } from "zod";

/**
 * Core: env + shared constants kecil.
 * Domain logic (pricing/order/file) tidak diletakkan di sini agar tidak duplikat.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_NAME: z.string().default("Printora"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  APP_NAME: process.env.APP_NAME,
  APP_URL: process.env.APP_URL,
});

export const APP = {
  BRAND: "Printora",
  SLOGAN: "Cetak hemat, kualitas hebat",
} as const;
