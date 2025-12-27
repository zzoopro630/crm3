CREATE TABLE "contracts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contracts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer NOT NULL,
	"insurance_company" text NOT NULL,
	"product_name" text NOT NULL,
	"premium" integer,
	"payment_period" text,
	"memo" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customer_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"customer_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
