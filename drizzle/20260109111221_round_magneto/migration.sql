CREATE TYPE "public"."customer_type_enum" AS ENUM('personal', 'db');--> statement-breakpoint
CREATE TABLE "customer_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" integer NOT NULL,
	"label_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6B7280' NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "security_level" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "security_level" SET DEFAULT 'F5'::text;--> statement-breakpoint
DROP TYPE "public"."security_level_enum";--> statement-breakpoint
CREATE TYPE "public"."security_level_enum" AS ENUM('F1', 'F2', 'F3', 'F4', 'F5');--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "security_level" SET DEFAULT 'F5'::"public"."security_level_enum";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "security_level" SET DATA TYPE "public"."security_level_enum" USING "security_level"::"public"."security_level_enum";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address_detail" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "type" "customer_type_enum" DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "interest_product" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "memo" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "existing_insurance" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "insurance_type" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "annual_income" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "marital_status" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;