-- Printora MVP schema (PostgreSQL)
-- Fokus: minimal, jelas, siap dipakai produksi awal

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'draft',
      'awaiting_payment',
      'waiting_verification',
      'accepted',
      'rejected',
      'processing',
      'completed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'color_category') THEN
    CREATE TYPE color_category AS ENUM (
      'bw',
      'light_color',
      'full_color',
      'mixed',
      'unknown'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversion_status') THEN
    CREATE TYPE conversion_status AS ENUM (
      'not_needed',
      'pending',
      'success',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(16) NOT NULL UNIQUE,

  customer_name VARCHAR(120) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_whatsapp VARCHAR(32) NOT NULL,
  note TEXT NULL,

  status order_status NOT NULL DEFAULT 'draft',
  is_manual_check_required BOOLEAN NOT NULL DEFAULT false,

  page_count INTEGER NOT NULL CHECK (page_count >= 1),
  color_category color_category NOT NULL DEFAULT 'unknown',

  price_per_page INTEGER NOT NULL CHECK (price_per_page >= 0),
  pages_amount INTEGER NOT NULL CHECK (pages_amount >= 0),
  folder_fee INTEGER NOT NULL DEFAULT 500 CHECK (folder_fee >= 0),
  unique_code INTEGER NOT NULL CHECK (unique_code >= 1 AND unique_code <= 400),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),

  payment_method VARCHAR(32) NOT NULL DEFAULT 'qris_static',
  paid_clicked_at TIMESTAMPTZ NULL,

  analysis_confidence NUMERIC(5,2) NULL,
  admin_note TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  original_filename TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),

  storage_path TEXT NOT NULL,
  is_pdf BOOLEAN NOT NULL DEFAULT false,

  is_converted_to_pdf BOOLEAN NOT NULL DEFAULT false,
  converted_pdf_path TEXT NULL,
  conversion_status conversion_status NOT NULL DEFAULT 'not_needed',

  file_hash VARCHAR(128) NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON orders;
CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();