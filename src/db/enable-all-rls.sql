-- 모든 테이블 RLS 활성화
-- Supabase SQL Editor에서 실행하세요
-- https://supabase.com/dashboard → SQL Editor

-- ============================================
-- 1. 모든 테이블에 RLS 활성화
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. customers 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

CREATE POLICY "Authenticated users can view customers"
    ON customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert customers"
    ON customers FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
    ON customers FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete customers"
    ON customers FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 3. employees 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;

CREATE POLICY "Authenticated users can view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================
-- 4. customer_notes 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view notes" ON customer_notes;
DROP POLICY IF EXISTS "Authenticated users can insert notes" ON customer_notes;
DROP POLICY IF EXISTS "Authenticated users can update notes" ON customer_notes;
DROP POLICY IF EXISTS "Authenticated users can delete notes" ON customer_notes;

CREATE POLICY "Authenticated users can view notes"
    ON customer_notes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert notes"
    ON customer_notes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update notes"
    ON customer_notes FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete notes"
    ON customer_notes FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 5. contracts 테이블 정책
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contracts;

CREATE POLICY "Authenticated users can view contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert contracts"
    ON contracts FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
    ON contracts FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete contracts"
    ON contracts FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 완료! 이제 인증된 사용자만 데이터에 접근 가능합니다.
-- 익명 사용자(anon key만 가진 사람)는 접근 불가
-- ============================================
