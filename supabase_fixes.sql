-- Run this in the Supabase SQL Editor

-- 1. Fix RLS Policies for Expenses (403 Forbidden)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(allowed_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.expenses;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.expenses;

CREATE POLICY "Allow authenticated insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin', 'storekeeper']));

-- 2. Ensure Customers table handles boolean for is_contractor (400 Bad Request)
-- If is_contractor was created as text or integer, this casts it to boolean
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'is_contractor' AND data_type != 'boolean'
  ) THEN
    ALTER TABLE public.customers ALTER COLUMN is_contractor TYPE boolean USING CASE WHEN is_contractor::text IN ('1', 'true', 't', 'yes', 'y') THEN true ELSE false END;
  END IF;
END $$;

-- Enable RLS for customers too just in case
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.customers;

CREATE POLICY "Allow authenticated insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin', 'storekeeper']));

-- 3. Ensure profiles table exists for AdminSettings query (401 Unauthorized fix)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'storekeeper',
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT TO authenticated USING (true);
-- Only the user can update their own profile, or admins
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'storekeeper');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Fix RLS Policies for all other tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.products;

CREATE POLICY "Allow authenticated insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update" ON public.products FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated delete" ON public.products FOR DELETE TO authenticated USING (public.has_role(ARRAY['admin']));

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.sales;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.sales;

CREATE POLICY "Allow authenticated insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.sales FOR SELECT TO authenticated USING (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.sale_items;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.sale_items;

CREATE POLICY "Allow authenticated insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.sale_items FOR SELECT TO authenticated USING (true);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.journal_entries;

CREATE POLICY "Allow authenticated insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.journal_entries FOR SELECT TO authenticated USING (true);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.logs;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.logs;

CREATE POLICY "Allow authenticated insert" ON public.logs FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "Allow authenticated select" ON public.logs FOR SELECT TO authenticated USING (true);

-- 5. Fix search_path for record_sale_transaction function
CREATE OR REPLACE FUNCTION public.record_sale_transaction(p_customer_name text, p_amount_paid numeric, p_payment_method text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_sale_id UUID;
  v_total_amount NUMERIC := 0;
  v_item RECORD;
BEGIN
  -- Calculate Total
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, unit_price NUMERIC)
  LOOP
    v_total_amount := v_total_amount + (v_item.quantity * v_item.unit_price);
  END LOOP;

  -- 1. Insert Sale
  INSERT INTO public.sales (customer_name, total_amount, amount_paid, balance_due, payment_status, payment_method)
  VALUES (p_customer_name, v_total_amount, p_amount_paid, v_total_amount - p_amount_paid,
    CASE WHEN p_amount_paid >= v_total_amount THEN 'PAID' WHEN p_amount_paid > 0 THEN 'PARTIAL' ELSE 'CREDIT' END,
    p_payment_method) RETURNING id INTO v_sale_id;

  -- 2. Process Items & Deduct Stock
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, unit_price NUMERIC)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.quantity * v_item.unit_price);
    
    UPDATE public.products SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 3. Double-Entry Accounting
  INSERT INTO public.journal_entries (sale_id, account_type, credit, description) VALUES (v_sale_id, 'REVENUE', v_total_amount, 'Revenue from Sale #' || v_sale_id);
  
  IF p_amount_paid > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) VALUES (v_sale_id, pg_catalog.upper(p_payment_method), p_amount_paid, 'Payment received');
  END IF;
  
  IF (v_total_amount - p_amount_paid) > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) VALUES (v_sale_id, 'ACCOUNTS_RECEIVABLE', v_total_amount - p_amount_paid, 'Debt recorded');
  END IF;

  RETURN v_sale_id;
END;
$function$;
-- =============================================
-- STORAGE CONFIGURATION
-- =============================================

-- Create a bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create Debtors View (SECURITY INVOKER)
DROP VIEW IF EXISTS public.debtors;
CREATE VIEW public.debtors 
WITH (security_invoker = true)
AS
SELECT 
    c.id as customer_id,
    c.full_name as customer_name,
    c.phone,
    SUM(s.total_amount - s.amount_paid) as total_debt,
    MAX(s.created_at) as last_sale_date,
    COUNT(s.id) as pending_sales_count
FROM public.sales s
JOIN public.customers c ON s.customer_id = c.id
WHERE s.payment_status = 'pending'
GROUP BY c.id, c.full_name, c.phone;

GRANT SELECT ON public.debtors TO authenticated;
GRANT SELECT ON public.debtors TO anon;
GRANT SELECT ON public.debtors TO service_role;
