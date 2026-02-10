/**
 * #164 메뉴 권한 시스템 마이그레이션
 * M등급 추가 + employee_menu_overrides 테이블 생성
 *
 * 실행: npx tsx src/db/migrate-menu-roles.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL 환경변수가 필요합니다.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function migrate() {
  console.log("=== #164 메뉴 권한 시스템 마이그레이션 시작 ===\n");

  // 1. M등급 enum 추가 (이미 있으면 무시)
  const levels = ["M1", "M2", "M3"];
  for (const level of levels) {
    try {
      await sql.unsafe(
        `ALTER TYPE security_level_enum ADD VALUE IF NOT EXISTS '${level}'`
      );
      console.log(`✓ security_level_enum에 '${level}' 추가됨`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`- '${level}' 이미 존재, 건너뜀`);
      } else {
        throw e;
      }
    }
  }

  // 2. employee_menu_overrides 테이블 생성
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS employee_menu_overrides (
      id SERIAL PRIMARY KEY,
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      menu_path TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, menu_path)
    )
  `);
  console.log("✓ employee_menu_overrides 테이블 생성됨");

  // 3. 기본 권한 시드 데이터 (app_settings에 menu_role: 키)
  const defaultRoles: Record<string, Record<string, string>> = {
    "/":                          { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"editor",M2:"editor",M3:"editor" },
    "/notices":                   { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" },
    "/resources":                 { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"viewer",M2:"viewer",M3:"viewer" },
    "/customers":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"editor",M1:"none",M2:"none",M3:"none" },
    "/customers/trash":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/inquiries":                 { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
    "/consultant-inquiries":      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"editor",M3:"viewer" },
    "/recruit-inquiries":         { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"none",M3:"none" },
    "/team":                      { F1:"editor",F2:"editor",F3:"editor",F4:"editor",F5:"viewer",M1:"editor",M2:"viewer",M3:"viewer" },
    "/contacts-direct":           { F1:"editor",F2:"editor",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/ads/ndata":                 { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/powerlink":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/report":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/weekly":                { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/rank-dashboard":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/rank-keywords":         { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/rank-urls":             { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/ads/rank-history":          { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"editor",M2:"viewer",M3:"none" },
    "/settings/organizations":    { F1:"editor",F2:"viewer",F3:"viewer",F4:"viewer",F5:"viewer",M1:"none",M2:"none",M3:"none" },
    "/settings/labels":           { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/settings/menus":            { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/settings/menu-permissions": { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/settings/employees":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
    "/settings/approvals":        { F1:"editor",F2:"none",F3:"none",F4:"none",F5:"none",M1:"none",M2:"none",M3:"none" },
  };

  let seeded = 0;
  for (const [path, roles] of Object.entries(defaultRoles)) {
    const key = `menu_role:${path}`;
    const value = JSON.stringify(roles);
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO NOTHING
    `;
    seeded++;
  }
  console.log(`✓ 기본 권한 시드 데이터 ${seeded}건 (이미 있으면 건너뜀)`);

  console.log("\n=== 마이그레이션 완료 ===");
  await sql.end();
}

migrate().catch((e) => {
  console.error("마이그레이션 실패:", e);
  process.exit(1);
});
