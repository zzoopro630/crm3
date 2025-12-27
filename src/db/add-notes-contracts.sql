-- Issue #13: 메모 및 계약 테이블 생성
-- Supabase SQL Editor에서 실행하세요

-- ============ Customer Notes Table ============
CREATE TABLE IF NOT EXISTS customer_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ Contracts Table ============
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    insurance_company TEXT NOT NULL,
    product_name TEXT NOT NULL,
    premium INTEGER,
    payment_period TEXT,
    memo TEXT,
    created_by UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_notes
CREATE POLICY "Employees can view all notes"
    ON customer_notes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can insert notes"
    ON customer_notes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Employees can update their own notes"
    ON customer_notes FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "Employees can delete their own notes"
    ON customer_notes FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- RLS Policies for contracts
CREATE POLICY "Employees can view all contracts"
    ON contracts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can insert contracts"
    ON contracts FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Employees can update their own contracts"
    ON contracts FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "Employees can delete their own contracts"
    ON contracts FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());
