import { pgTable, pgEnum, uuid, text, boolean, timestamp, integer, date } from 'drizzle-orm/pg-core'

// ============ ENUM Types ============
export const securityLevelEnum = pgEnum('security_level_enum', ['F1', 'F2', 'F3', 'F4', 'F5'])
export const customerStatusEnum = pgEnum('customer_status_enum', ['new', 'contacted', 'consulting', 'closed', 'called', 'texted', 'no_answer', 'rejected', 'wrong_number', 'ineligible', 'upsell'])
export const genderEnum = pgEnum('gender_enum', ['남성', '여성', '법인'])
export const approvalStatusEnum = pgEnum('approval_status_enum', ['pending', 'approved', 'rejected'])
export const customerTypeEnum = pgEnum('customer_type_enum', ['personal', 'db'])

// ============ Organizations Table ============
// Note: Self-references and cross-refs defined via DB-level constraints (not Drizzle schema) to avoid TypeScript issues
export const organizations = pgTable('organizations', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    parentId: integer('parent_id'), // FK to organizations.id (self-ref via DB constraint)
    managerId: uuid('manager_id'), // FK to employees.id (cross-ref via DB constraint)
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Employees Table ============
export const employees = pgTable('employees', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    securityLevel: securityLevelEnum('security_level').notNull().default('F5'),
    parentId: uuid('parent_id'), // FK to employees.id (self-ref via DB constraint)
    organizationId: integer('organization_id'), // FK to organizations.id (via DB constraint)
    positionName: text('position_name'),
    department: text('department'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Pending Approvals Table ============
export const pendingApprovals = pgTable('pending_approvals', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    requestedAt: timestamp('requested_at').defaultNow(),
    status: approvalStatusEnum('status').default('pending'),
    processedBy: uuid('processed_by'), // FK to employees.id (via DB constraint)
    processedAt: timestamp('processed_at'),
})

// ============ Customers Table ============
export const customers = pgTable('customers', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    managerId: uuid('manager_id').notNull(), // FK to employees.id (via DB constraint)
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    addressDetail: text('address_detail'), // 상세주소
    gender: genderEnum('gender'),
    birthdate: date('birthdate'),
    company: text('company'),
    jobTitle: text('job_title'),
    source: text('source'),
    status: customerStatusEnum('status').notNull().default('new'),
    type: customerTypeEnum('type').default('personal').notNull(),
    interestProduct: text('interest_product'),
    memo: text('memo'),
    adminComment: text('admin_comment'),
    // 추가 정보 필드
    nationality: text('nationality'), // 국적
    existingInsurance: text('existing_insurance'), // 기존 보험사
    insuranceType: text('insurance_type'), // 보험 유형 (생명, 손해, 종합 등)
    annualIncome: text('annual_income'), // 연수입 범위
    maritalStatus: text('marital_status'), // 결혼 여부
    notes: text('notes'), // 특이사항
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Sources Table ============
export const sources = pgTable('sources', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
})

// ============ Customer Notes Table ============
export const customerNotes = pgTable('customer_notes', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer('customer_id').notNull(), // FK to customers.id (via DB constraint)
    content: text('content').notNull(),
    createdBy: uuid('created_by').notNull(), // FK to employees.id (via DB constraint)
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Contracts Table ============
export const contracts = pgTable('contracts', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer('customer_id').notNull(), // FK to customers.id (via DB constraint)
    insuranceCompany: text('insurance_company').notNull(),
    productName: text('product_name').notNull(),
    premium: integer('premium'),
    paymentPeriod: text('payment_period'),
    memo: text('memo'),
    createdBy: uuid('created_by').notNull(), // FK to employees.id (via DB constraint)
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Type Exports ============
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
export type PendingApproval = typeof pendingApprovals.$inferSelect
export type NewPendingApproval = typeof pendingApprovals.$inferInsert
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Source = typeof sources.$inferSelect
export type CustomerNote = typeof customerNotes.$inferSelect
export type NewCustomerNote = typeof customerNotes.$inferInsert
export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert

// ============ ENUM Value Types ============
export type SecurityLevel = typeof securityLevelEnum.enumValues[number]
export type CustomerStatus = typeof customerStatusEnum.enumValues[number]
export type Gender = typeof genderEnum.enumValues[number]
export const APPROVAL_STATUSES = approvalStatusEnum.enumValues
export type CustomerType = typeof customerTypeEnum.enumValues[number]
export type ApprovalStatus = typeof approvalStatusEnum.enumValues[number]
