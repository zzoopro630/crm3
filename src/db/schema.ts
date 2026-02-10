import {
  pgTable,
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  bigserial,
  bigint,
  date,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ============ ENUM Types ============
export const securityLevelEnum = pgEnum("security_level_enum", [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "M1",
  "M2",
  "M3",
]);
export const customerStatusEnum = pgEnum("customer_status_enum", [
  "new",
  "contacted",
  "consulting",
  "closed",
  "called",
  "texted",
  "no_answer",
  "rejected",
  "wrong_number",
  "ineligible",
  "upsell",
]);
export const genderEnum = pgEnum("gender_enum", ["남성", "여성", "법인"]);
export const approvalStatusEnum = pgEnum("approval_status_enum", [
  "pending",
  "approved",
  "rejected",
]);
export const customerTypeEnum = pgEnum("customer_type_enum", [
  "personal",
  "db",
]);

// ============ Organizations Table ============
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  parentId: integer("parent_id").references(
    (): AnyPgColumn => organizations.id,
    { onDelete: "set null" }
  ),
  managerId: uuid("manager_id"), // FK to employees.id added via separate migration due to circular dependency
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Employees Table ============
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  securityLevel: securityLevelEnum("security_level").notNull().default("F5"),
  parentId: uuid("parent_id").references((): AnyPgColumn => employees.id, {
    onDelete: "set null",
  }),
  organizationId: integer("organization_id").references(
    () => organizations.id,
    { onDelete: "set null" }
  ),
  positionName: text("position_name"),
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Pending Approvals Table ============
export const pendingApprovals = pgTable("pending_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  requestedAt: timestamp("requested_at").defaultNow(),
  status: approvalStatusEnum("status").default("pending"),
  processedBy: uuid("processed_by").references(() => employees.id, {
    onDelete: "set null",
  }),
  processedAt: timestamp("processed_at"),
});

// ============ Sources Table ============
export const sources = pgTable("sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ Customers Table ============
export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  managerId: uuid("manager_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  addressDetail: text("address_detail"),
  gender: genderEnum("gender"),
  birthdate: date("birthdate"),
  company: text("company"),
  jobTitle: text("job_title"),
  source: text("source"),
  status: customerStatusEnum("status").notNull().default("new"),
  type: customerTypeEnum("type").default("personal").notNull(),
  interestProduct: text("interest_product"),
  memo: text("memo"),
  adminComment: text("admin_comment"),
  nationality: text("nationality"),
  existingInsurance: text("existing_insurance"),
  insuranceType: text("insurance_type"),
  annualIncome: text("annual_income"),
  maritalStatus: text("marital_status"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Customer Notes Table ============
export const customerNotes = pgTable("customer_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Labels Table ============
export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6B7280"),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Customer Labels Junction Table ============
export const customerLabels = pgTable("customer_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  labelId: uuid("label_id")
    .notNull()
    .references(() => labels.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ Contracts Table ============
export const contracts = pgTable("contracts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  insuranceCompany: text("insurance_company").notNull(),
  productName: text("product_name").notNull(),
  premium: integer("premium"),
  paymentPeriod: text("payment_period"),
  memo: text("memo"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ Contacts Table ============
export const jobTitleEnum = pgEnum("job_title_enum", [
  "대표",
  "총괄이사",
  "사업단장",
  "지점장",
  "팀장",
  "실장",
  "과장",
  "대리",
]);

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: jobTitleEnum("title"),
  team: text("team").default("미지정"),
  phone: text("phone").notNull(),
  managerId: uuid("manager_id").references((): AnyPgColumn => contacts.id, {
    onDelete: "set null",
  }),
  employeeId: uuid("employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// ============ Type Exports ============
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type PendingApproval = typeof pendingApprovals.$inferSelect;
export type NewPendingApproval = typeof pendingApprovals.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type NewCustomerNote = typeof customerNotes.$inferInsert;
export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type CustomerLabel = typeof customerLabels.$inferSelect;
export type NewCustomerLabel = typeof customerLabels.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

// ============ Posts (게시판) ============
export const postCategoryEnum = pgEnum("post_category_enum", [
  "notice",
  "resource",
]);

export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  category: postCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  authorId: uuid("author_id")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const postAttachments = pgTable("post_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostAttachment = typeof postAttachments.$inferSelect;
export type NewPostAttachment = typeof postAttachments.$inferInsert;
export type PostCategory = (typeof postCategoryEnum.enumValues)[number];

// ============ SEO Schema (순위 추적) ============
export const seoSchema = pgSchema("seo");

export const seoSites = seoSchema.table("sites", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const seoKeywords = seoSchema.table(
  "keywords",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    keyword: text("keyword").notNull(),
    siteId: bigint("site_id", { mode: "number" })
      .notNull()
      .references(() => seoSites.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_seo_keywords_site_id").on(table.siteId)]
);

export const seoRankings = seoSchema.table(
  "rankings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    keywordId: bigint("keyword_id", { mode: "number" })
      .notNull()
      .references(() => seoKeywords.id, { onDelete: "cascade" }),
    rankPosition: integer("rank_position"),
    searchType: text("search_type").default("view"),
    checkedAt: timestamp("checked_at").defaultNow(),
    resultUrl: text("result_url"),
    resultTitle: text("result_title"),
  },
  (table) => [
    index("idx_seo_rankings_keyword_id").on(table.keywordId),
    index("idx_seo_rankings_checked_at").on(table.checkedAt),
  ]
);

export const seoTrackedUrls = seoSchema.table(
  "tracked_urls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    keyword: text("keyword").notNull(),
    targetUrl: text("target_url").notNull(),
    section: text("section"),
    memo: text("memo"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_seo_tracked_urls_active").on(table.isActive)]
);

export const seoUrlRankings = seoSchema.table(
  "url_rankings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    trackedUrlId: bigint("tracked_url_id", { mode: "number" })
      .notNull()
      .references(() => seoTrackedUrls.id, { onDelete: "cascade" }),
    rankPosition: integer("rank_position"),
    sectionName: text("section_name"),
    sectionRank: integer("section_rank"),
    checkedAt: timestamp("checked_at").defaultNow(),
  },
  (table) => [
    index("idx_seo_url_rankings_tracked_url_id").on(table.trackedUrlId),
    index("idx_seo_url_rankings_checked_at").on(table.checkedAt),
  ]
);

// SEO Type Exports
export type SeoSite = typeof seoSites.$inferSelect;
export type NewSeoSite = typeof seoSites.$inferInsert;
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type NewSeoKeyword = typeof seoKeywords.$inferInsert;
export type SeoRanking = typeof seoRankings.$inferSelect;
export type NewSeoRanking = typeof seoRankings.$inferInsert;
export type SeoTrackedUrl = typeof seoTrackedUrls.$inferSelect;
export type NewSeoTrackedUrl = typeof seoTrackedUrls.$inferInsert;
export type SeoUrlRanking = typeof seoUrlRankings.$inferSelect;
export type NewSeoUrlRanking = typeof seoUrlRankings.$inferInsert;

// ============ Employee Menu Overrides Table ============
export const employeeMenuOverrides = pgTable("employee_menu_overrides", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  menuPath: text("menu_path").notNull(),
  role: text("role").notNull(), // 'none' | 'viewer' | 'editor'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EmployeeMenuOverride = typeof employeeMenuOverrides.$inferSelect;
export type NewEmployeeMenuOverride = typeof employeeMenuOverrides.$inferInsert;

// ============ ENUM Value Types ============
export type SecurityLevel = (typeof securityLevelEnum.enumValues)[number];
export type CustomerStatus = (typeof customerStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export const APPROVAL_STATUSES = approvalStatusEnum.enumValues;
export type CustomerType = (typeof customerTypeEnum.enumValues)[number];
export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];
