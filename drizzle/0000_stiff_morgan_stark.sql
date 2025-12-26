CREATE TYPE "public"."approval_status_enum" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."customer_status_enum" AS ENUM('new', 'contacted', 'consulting', 'closed');--> statement-breakpoint
CREATE TYPE "public"."gender_enum" AS ENUM('남성', '여성', '법인');--> statement-breakpoint
CREATE TYPE "public"."security_level_enum" AS ENUM('F1', 'F2', 'F3', 'F4', 'F5', 'F6');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"manager_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"gender" "gender_enum",
	"birthdate" date,
	"company" text,
	"job_title" text,
	"source" text,
	"status" "customer_status_enum" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"security_level" "security_level_enum" DEFAULT 'F6' NOT NULL,
	"parent_id" uuid,
	"organization_id" integer,
	"position_name" text,
	"department" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"parent_id" integer,
	"manager_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"status" "approval_status_enum" DEFAULT 'pending',
	"processed_by" uuid,
	"processed_at" timestamp,
	CONSTRAINT "pending_approvals_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sources_name_unique" UNIQUE("name")
);
