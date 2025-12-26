-- 상태 ENUM에 새 값 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 ENUM에 새 값 추가
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'called';        -- 통화완료
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'texted';        -- 문자남김
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'no_answer';     -- 부재
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'rejected';      -- 거절
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'wrong_number';  -- 결번
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'ineligible';    -- 가입불가
ALTER TYPE customer_status_enum ADD VALUE IF NOT EXISTS 'upsell';        -- 추가제안

-- 확인
SELECT unnest(enum_range(NULL::customer_status_enum));
