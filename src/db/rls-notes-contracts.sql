-- Issue #13: RLS 정책 추가
-- Supabase SQL Editor에서 실행하세요

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Employees can view all notes" ON customer_notes;
DROP POLICY IF EXISTS "Employees can insert notes" ON customer_notes;
DROP POLICY IF EXISTS "Employees can update notes" ON customer_notes;
DROP POLICY IF EXISTS "Employees can delete notes" ON customer_notes;
DROP POLICY IF EXISTS "Employees can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Employees can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Employees can update contracts" ON contracts;
DROP POLICY IF EXISTS "Employees can delete contracts" ON contracts;

-- RLS Policies for customer_notes (모든 인증된 사용자 허용)
CREATE POLICY "Employees can view all notes"
    ON customer_notes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can insert notes"
    ON customer_notes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Employees can update notes"
    ON customer_notes FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Employees can delete notes"
    ON customer_notes FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for contracts (모든 인증된 사용자 허용)
CREATE POLICY "Employees can view all contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can insert contracts"
    ON contracts FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Employees can update contracts"
    ON contracts FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Employees can delete contracts"
    ON contracts FOR DELETE
    TO authenticated
    USING (true);
