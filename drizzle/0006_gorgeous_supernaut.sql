CREATE TYPE "public"."job_title_enum" AS ENUM('대표', '총괄이사', '사업단장', '지점장', '팀장', '실장', '과장', '대리');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" "job_title_enum",
	"team" text DEFAULT '미지정',
	"phone" text NOT NULL,
	"manager_id" uuid,
	"employee_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_manager_id_contacts_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;