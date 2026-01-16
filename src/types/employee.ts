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

// Security levels constant
export const SECURITY_LEVELS = [
  { value: "F1", label: "F1 - 최고관리자" },
  { value: "F2", label: "F2 - 총괄이사" },
  { value: "F3", label: "F3 - 사업단장" },
  { value: "F4", label: "F4 - 지점장" },
  { value: "F5", label: "F5 - 팀장" },
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
