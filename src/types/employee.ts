// Re-export Drizzle inferred types
export type {
  Employee,
  NewEmployee,
  PendingApproval,
  NewPendingApproval,
  Customer,
  NewCustomer,
  Source,
  SecurityLevel,
  ApprovalStatus,
} from "@/db/schema";

// Security levels constant (직급과 분리된 개념)
export const SECURITY_LEVELS = [
  { value: "F1", label: "F1" },
  { value: "F2", label: "F2" },
  { value: "F3", label: "F3" },
  { value: "F4", label: "F4" },
  { value: "F5", label: "F5" },
  { value: "M1", label: "M1" },
  { value: "M2", label: "M2" },
  { value: "M3", label: "M3" },
] as const;

export type SecurityLevelValue = (typeof SECURITY_LEVELS)[number]["value"];

// Input types for forms
export interface CreateEmployeeInput {
  email: string;
  fullName: string;
  securityLevel: SecurityLevelValue;
  parentId?: string | null;
  organizationId?: number | null;
  positionName?: string | null;
  department?: string | null;
}

export interface UpdateEmployeeInput {
  email?: string;
  fullName?: string;
  securityLevel?: SecurityLevelValue;
  parentId?: string | null;
  organizationId?: number | null;
  positionName?: string | null;
  department?: string | null;
  isActive?: boolean;
}
