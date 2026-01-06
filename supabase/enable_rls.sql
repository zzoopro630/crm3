-- Enable Row Level Security (RLS) on all tables
-- Run this in the Supabase SQL Editor

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pending_approvals table
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on employees table
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sources table
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customer_notes table
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on contracts table
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- Create policies for service_role access
-- (service_role bypasses RLS by default, but we add explicit policies for clarity)
-- ==========================================

-- Customers policies
CREATE POLICY "service_role_all_customers" ON public.customers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_customers" ON public.customers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Pending Approvals policies  
CREATE POLICY "service_role_all_pending_approvals" ON public.pending_approvals
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_pending_approvals" ON public.pending_approvals
    FOR SELECT USING (auth.role() = 'authenticated');

-- Employees policies
CREATE POLICY "service_role_all_employees" ON public.employees
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_employees" ON public.employees
    FOR SELECT USING (auth.role() = 'authenticated');

-- Sources policies
CREATE POLICY "service_role_all_sources" ON public.sources
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_sources" ON public.sources
    FOR SELECT USING (auth.role() = 'authenticated');

-- Organizations policies
CREATE POLICY "service_role_all_organizations" ON public.organizations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_organizations" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Customer Notes policies
CREATE POLICY "service_role_all_customer_notes" ON public.customer_notes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_customer_notes" ON public.customer_notes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Contracts policies
CREATE POLICY "service_role_all_contracts" ON public.contracts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_contracts" ON public.contracts
    FOR SELECT USING (auth.role() = 'authenticated');
