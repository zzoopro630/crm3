CREATE TABLE IF NOT EXISTS "app_settings" (
  "id" serial PRIMARY KEY,
  "key" text UNIQUE NOT NULL,
  "value" text,
  "updated_by" uuid,
  "updated_at" timestamptz DEFAULT now()
);
