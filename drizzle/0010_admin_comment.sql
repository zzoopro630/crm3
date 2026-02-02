-- marketing.inquiries 테이블에 admin_comment 컬럼 추가
ALTER TABLE marketing.inquiries ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- marketing.consultant_inquiries 테이블에 admin_comment 컬럼 추가
ALTER TABLE marketing.consultant_inquiries ADD COLUMN IF NOT EXISTS admin_comment TEXT;
