-- marketing 스키마 RLS 활성화: recruit_inquiries, consultant_inquiries
-- 기존 5개 테이블(inquiries, keyword_details, ga_summary, ga_totals, keyword_reports)은 이미 활성화 상태
-- 두 테이블 모두 postgres + service_role만 GRANT되어 있어 anon 접근 불가
-- service_role은 RLS bypass하므로 별도 정책 불필요

ALTER TABLE marketing.recruit_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.consultant_inquiries ENABLE ROW LEVEL SECURITY;
