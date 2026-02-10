import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("SUPABASE_DB_URL 또는 DATABASE_URL 환경변수가 필요합니다.");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function migrate() {
  console.log("=== 게시판 카테고리 마이그레이션 시작 ===\n");

  // 1. board_categories 테이블 생성
  console.log("1. board_categories 테이블 생성...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS board_categories (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("   완료\n");

  // 2. 시드 데이터 삽입 (이미 존재하면 무시)
  console.log("2. 시드 데이터 삽입 (notice, resource)...");
  await db.execute(sql`
    INSERT INTO board_categories (slug, name, icon, sort_order)
    VALUES ('notice', '공지사항', 'Megaphone', 1),
           ('resource', '자료실', 'FolderOpen', 2)
    ON CONFLICT (slug) DO NOTHING
  `);
  console.log("   완료\n");

  // 3. posts.category 컬럼 타입 → text 변환
  console.log("3. posts.category 컬럼 타입 → text 변환...");
  await db.execute(sql`
    ALTER TABLE posts ALTER COLUMN category TYPE text
  `);
  console.log("   완료\n");

  // 4. post_category_enum 타입 삭제
  console.log("4. post_category_enum 타입 삭제...");
  await db.execute(sql`
    DROP TYPE IF EXISTS post_category_enum
  `);
  console.log("   완료\n");

  // 5. app_settings 키 마이그레이션
  console.log("5. app_settings 메뉴 권한 키 마이그레이션...");

  // /notices → /board/notice
  const noticeResult = await db.execute(sql`
    SELECT value FROM app_settings WHERE key = 'menu_role:/notices'
  `);
  if (noticeResult.length > 0) {
    await db.execute(sql`
      INSERT INTO app_settings (key, value)
      VALUES ('menu_role:/board/notice', ${noticeResult[0].value})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
    await db.execute(sql`
      DELETE FROM app_settings WHERE key = 'menu_role:/notices'
    `);
    console.log("   /notices → /board/notice 마이그레이션 완료");
  }

  // /resources → /board/resource
  const resourceResult = await db.execute(sql`
    SELECT value FROM app_settings WHERE key = 'menu_role:/resources'
  `);
  if (resourceResult.length > 0) {
    await db.execute(sql`
      INSERT INTO app_settings (key, value)
      VALUES ('menu_role:/board/resource', ${resourceResult[0].value})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
    await db.execute(sql`
      DELETE FROM app_settings WHERE key = 'menu_role:/resources'
    `);
    console.log("   /resources → /board/resource 마이그레이션 완료");
  }

  // employee_menu_overrides 키도 마이그레이션
  await db.execute(sql`
    UPDATE employee_menu_overrides
    SET menu_path = '/board/notice'
    WHERE menu_path = '/notices'
  `);
  await db.execute(sql`
    UPDATE employee_menu_overrides
    SET menu_path = '/board/resource'
    WHERE menu_path = '/resources'
  `);
  console.log("   employee_menu_overrides 키 마이그레이션 완료\n");

  console.log("=== 마이그레이션 완료 ===");
  await client.end();
}

migrate().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
