-- P0-2 (부분): anon 역할에서 marketing 스키마 DELETE 권한 제거
-- 배경: anon key로 고객 데이터 삭제 가능한 상태 → 삭제 권한만 우선 제거
-- ads 프론트엔드가 anon key로 SELECT/INSERT/UPDATE를 사용하므로 완전 REVOKE는 불가

REVOKE DELETE ON ALL TABLES IN SCHEMA "marketing" FROM anon;
