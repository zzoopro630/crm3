import { pgTable, pgEnum, uuid, text, boolean, timestamp, integer, date } from 'drizzle-orm/pg-core'

// ============ ENUM Types ============
export const securityLevelEnum = pgEnum('security_level_enum', ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
export const customerStatusEnum = pgEnum('customer_status_enum', ['new', 'contacted', 'consulting', 'closed', 'called', 'texted', 'no_answer', 'rejected', 'wrong_number', 'ineligible', 'upsell'])
export const genderEnum = pgEnum('gender_enum', ['남성', '여성', '법인'])
export const approvalStatusEnum = pgEnum('approval_status_enum', ['pending', 'approved', 'rejected'])

// ============ Organizations Table ============
export const organizations = pgTable('organizations', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    parentId: integer('parent_id'),
    managerId: uuid('manager_id'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Employees Table ============
export const employees = pgTable('employees', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    securityLevel: securityLevelEnum('security_level').notNull().default('F6'),
    parentId: uuid('parent_id'),
    organizationId: integer('organization_id'),
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
    processedBy: uuid('processed_by'),
    processedAt: timestamp('processed_at'),
})

// ============ Customers Table ============
export const customers = pgTable('customers', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    managerId: uuid('manager_id').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    gender: genderEnum('gender'),
    birthdate: date('birthdate'),
    company: text('company'),
    jobTitle: text('job_title'),
    source: text('source'),
    status: customerStatusEnum('status').notNull().default('new'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// ============ Sources Table ============
export const sources = pgTable('sources', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
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

// ============ ENUM Value Types ============
export type SecurityLevel = typeof securityLevelEnum.enumValues[number]
export type CustomerStatus = typeof customerStatusEnum.enumValues[number]
export type Gender = typeof genderEnum.enumValues[number]
export type ApprovalStatus = typeof approvalStatusEnum.enumValues[number]

