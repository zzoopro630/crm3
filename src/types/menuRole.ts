export type MenuRole = "none" | "viewer" | "editor";

// 메뉴 경로 → 역할 맵 (현재 로그인 사용자 기준)
export type MenuRoleMap = Record<string, MenuRole>;

// 개별 직원 오버라이드
export interface EmployeeMenuOverride {
  menuPath: string;
  role: MenuRole;
}

// 등급별 기본 권한 맵 (app_settings 저장 형태)
export type LevelRoleMap = Record<string, MenuRole>;

export const ALL_SECURITY_LEVELS = [
  "F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3",
] as const;

export type SecurityLevelValue = (typeof ALL_SECURITY_LEVELS)[number];
