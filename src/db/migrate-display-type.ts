import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL이 설정되지 않았습니다.");
  process.exit(1);
}

async function migrate() {
  const db = drizzle(DATABASE_URL as string);

  console.log("📦 board_categories에 display_type 컬럼 추가...");
  await db.execute(sql`
    ALTER TABLE board_categories
    ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'table'
  `);

  console.log("🖼️ DM자료실 display_type = 'gallery' 설정...");
  await db.execute(sql`
    UPDATE board_categories SET display_type = 'gallery' WHERE slug = 'dm'
  `);

  console.log("✅ 마이그레이션 완료");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ 마이그레이션 실패:", err);
  process.exit(1);
});
