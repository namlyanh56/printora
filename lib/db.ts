import { Pool } from "pg";
import { env } from "@/lib/core";

/**
 * Single shared PostgreSQL pool.
 * Untuk MVP cukup satu koneksi pool global.
 */
export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});