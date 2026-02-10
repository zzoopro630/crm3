/**
 * post-images Storage 버킷 + RLS 정책 설정
 *
 * 실행: npx tsx src/db/setup-post-images-storage.ts
 *
 * 주의: Supabase Storage 버킷은 SQL로 직접 생성 가능하나,
 *       대시보드에서 이미 생성한 경우 ON CONFLICT DO NOTHING으로 안전.
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

async function setup() {
  console.log("=== post-images Storage 설정 시작 ===\n");

  // 1. 버킷 생성
  console.log("1. post-images 버킷 생성...");
  await sql.unsafe(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'post-images',
      'post-images',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types
  `);
  console.log("   완료\n");

  // 2. RLS 정책
  console.log("2. RLS 정책 설정...");

  // 기존 정책 삭제 (재실행 안전)
  await sql.unsafe(`
    DROP POLICY IF EXISTS "post_images_public_read" ON storage.objects
  `);
  await sql.unsafe(`
    DROP POLICY IF EXISTS "post_images_auth_insert" ON storage.objects
  `);
  await sql.unsafe(`
    DROP POLICY IF EXISTS "post_images_auth_delete" ON storage.objects
  `);

  // Public read
  await sql.unsafe(`
    CREATE POLICY "post_images_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'post-images')
  `);
  console.log("   Public read 정책 완료");

  // Authenticated insert
  await sql.unsafe(`
    CREATE POLICY "post_images_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'post-images')
  `);
  console.log("   Authenticated insert 정책 완료");

  // Authenticated delete
  await sql.unsafe(`
    CREATE POLICY "post_images_auth_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'post-images')
  `);
  console.log("   Authenticated delete 정책 완료\n");

  console.log("=== post-images Storage 설정 완료 ===");
  await sql.end();
}

setup().catch((err) => {
  console.error("설정 실패:", err);
  process.exit(1);
});
