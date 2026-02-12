import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { leadProducts } from "./schema";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL이 설정되지 않았습니다.");
  process.exit(1);
}

const B_PRODUCTS = [
  { dbType: "B", name: "3주납품", price: 75000, description: "보장분석 / 다양한 연령대 / 3주 이내 납품 완료 DB", sortOrder: 1 },
  { dbType: "B", name: "실버", price: 50000, description: "보장분석 / 보험 니즈 높은 고연령대 / 신청월 내 공급", sortOrder: 2 },
  { dbType: "B", name: "중장년", price: 85000, description: "보장분석 / 보험 관심 높은 중장년 / 신청월 내 공급", sortOrder: 3 },
  { dbType: "B", name: "여성100%", price: 80000, description: "보장분석 / 보험 니즈가 높은 여성 / 신청월 내 공급", sortOrder: 4 },
  { dbType: "B", name: "보험료20만원이상", price: 85000, description: "보장분석 / 보험료 20만원 이상 납입 / 신청월 내 공급", sortOrder: 5 },
  { dbType: "B", name: "방문확정", price: 90000, description: "보장분석 / 시간,장소 약속이 확정된 / 신청월 내 공급", sortOrder: 6 },
  { dbType: "B", name: "화재보험", price: 75000, description: "보장분석 / 화재보험(1년/일반화재) 무료가입 멘트로 확보된 / 신청월 내 공급 / 보험료 1만원 설계사 부담", sortOrder: 7 },
];

async function seed() {
  const db = drizzle(DATABASE_URL as string);

  // 기존 B업체 상품 확인
  const existing = await db.select().from(leadProducts).where(eq(leadProducts.dbType, "B"));

  if (existing.length > 0) {
    console.log(`이미 B업체 상품 ${existing.length}개 존재. 건너뜁니다.`);
    existing.forEach((p) => console.log(`  - ${p.name} (${p.price.toLocaleString()}원, active=${p.isActive})`));
    process.exit(0);
  }

  const result = await db.insert(leadProducts).values(B_PRODUCTS).returning();
  console.log(`B업체 상품 ${result.length}개 생성 완료:`);
  result.forEach((p) => console.log(`  - [${p.id}] ${p.name} (${p.price.toLocaleString()}원)`));

  process.exit(0);
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
