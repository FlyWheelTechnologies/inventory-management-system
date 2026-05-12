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

-- Ensure Product Schema is complete
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS buying_uom TEXT DEFAULT 'pcs';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_uom TEXT DEFAULT 'pcs';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;

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
-- 5. IMPROVED RECORD SALE TRANSACTION (1dp rounding + tax)
CREATE OR REPLACE FUNCTION public.record_sale_transaction(
  p_customer_id integer,
  p_customer_name text, 
  p_total_amount numeric,
  p_amount_paid numeric, 
  p_payment_method text, 
  p_payment_status text,
  p_items jsonb,
  p_recorded_by text,
  p_tax_percentage numeric DEFAULT 0,
  p_tax_inclusive boolean DEFAULT TRUE,
  p_credit_used numeric DEFAULT 0
)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_sale_id UUID;
  v_tax_amount NUMERIC := 0;
  v_net_amount NUMERIC := 0;
  v_total_with_tax NUMERIC;
  v_item RECORD;
BEGIN
  -- Tax Calculation
  IF p_tax_inclusive THEN
    v_net_amount := ROUND(p_total_amount / (1 + (p_tax_percentage / 100)), 1);
    v_tax_amount := ROUND(p_total_amount - v_net_amount, 1);
    v_total_with_tax := ROUND(p_total_amount, 1);
  ELSE
    v_tax_amount := ROUND(p_total_amount * (p_tax_percentage / 100), 1);
    v_net_amount := ROUND(p_total_amount, 1);
    v_total_with_tax := ROUND(p_total_amount + v_tax_amount, 1);
  END IF;

  -- Insert Sale Record
  INSERT INTO public.sales (
    customer_id, customer_name, total_amount, amount_paid, 
    balance_due, payment_status, payment_method, recorded_by,
    tax_percentage, tax_inclusive, tax_amount
  )
  VALUES (
    p_customer_id, p_customer_name, 
    v_total_with_tax, 
    ROUND(p_amount_paid + p_credit_used, 1),
    ROUND(v_total_with_tax - (p_amount_paid + p_credit_used), 1),
    p_payment_status, p_payment_method, p_recorded_by,
    p_tax_percentage, p_tax_inclusive, v_tax_amount
  ) RETURNING id INTO v_sale_id;

  -- Process Items
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(product_id UUID, product_name TEXT, quantity NUMERIC, unit_price NUMERIC, subtotal NUMERIC)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_item.product_id, v_item.product_name, v_item.quantity, v_item.unit_price, ROUND(v_item.subtotal, 1));
    
    UPDATE public.products SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- Journaling
  INSERT INTO public.journal_entries (sale_id, account_type, credit, description) 
  VALUES (v_sale_id, 'REVENUE', v_net_amount, 'Revenue from Sale #' || v_sale_id);
  
  IF v_tax_amount > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, credit, description) 
    VALUES (v_sale_id, 'TAX_PAYABLE', v_tax_amount, 'Tax collected');
  END IF;
  
  IF p_amount_paid > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, pg_catalog.upper(p_payment_method), ROUND(p_amount_paid, 1), 'Payment received');
  END IF;

  IF p_credit_used > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, 'CUSTOMER_DEPOSIT', ROUND(p_credit_used, 1), 'Applied from customer credit');
  END IF;
  
  IF (v_total_with_tax - (p_amount_paid + p_credit_used)) > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, 'ACCOUNTS_RECEIVABLE', ROUND(v_total_with_tax - (p_amount_paid + p_credit_used), 1), 'Debt recorded');
  END IF;

  RETURN v_sale_id;
END;
$function$;

-- 6. NEW FULFILLMENT FUNCTION (Handles regular and pure deposits)
CREATE OR REPLACE FUNCTION public.fulfill_sale(p_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  UPDATE public.sales
  SET payment_status = CASE 
    WHEN total_amount = 0 THEN 'PAID' 
    WHEN balance_due <= 0 THEN 'PAID' 
    ELSE 'PARTIAL' 
  END,
  notes = CASE 
    WHEN total_amount = 0 THEN COALESCE(notes, '') || ' (Fulfilled)' 
    ELSE notes 
  END
  WHERE id = p_sale_id;
END;
$$;
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

-- Create Debtors/Depositors View (SECURITY INVOKER)
DROP VIEW IF EXISTS public.deposits;
CREATE VIEW public.deposits 
WITH (security_invoker = true)
AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.phone,
    COALESCE(SUM(s.total_amount - s.amount_paid), 0) as total_balance,
    MAX(s.created_at) as last_sale_date,
    COUNT(s.id) FILTER (WHERE s.payment_status = 'DEPOSIT') as pending_sales_count
FROM public.customers c
JOIN public.sales s ON s.customer_id = c.id
GROUP BY c.id, c.name, c.phone
HAVING SUM(s.total_amount - s.amount_paid) != 0;

GRANT SELECT ON public.deposits TO authenticated;
GRANT SELECT ON public.deposits TO anon;
GRANT SELECT ON public.deposits TO service_role;

-- 4. NEW FUNCTION: RECORD PURE DEPOSIT (Money only, no stock)
CREATE OR REPLACE FUNCTION public.record_pure_deposit(
  p_customer_name text,
  p_customer_phone text,
  p_amount numeric,
  p_recorded_by text,
  p_payment_method text DEFAULT 'Cash'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id BIGINT;
  v_sale_id UUID;
BEGIN
  -- Find or create customer
  SELECT id INTO v_customer_id FROM public.customers WHERE phone = p_customer_phone LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone) VALUES (p_customer_name, p_customer_phone) RETURNING id INTO v_customer_id;
  END IF;

  -- Insert "Pure Deposit" Sale (No items, negative balance = credit)
  INSERT INTO public.sales (
    customer_id, customer_name, total_amount, amount_paid, 
    balance_due, payment_status, payment_method, recorded_by, notes
  )
  VALUES (
    v_customer_id, p_customer_name, 0, ROUND(p_amount, 1), -ROUND(p_amount, 1), 'PAID', p_payment_method, p_recorded_by, 'Pure Deposit (Prepayment)'
  ) RETURNING id INTO v_sale_id;

  -- Journaling
  INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
  VALUES (v_sale_id, pg_catalog.upper(p_payment_method), ROUND(p_amount, 1), 'Pure Deposit received');
  
  INSERT INTO public.journal_entries (sale_id, account_type, credit, description) 
  VALUES (v_sale_id, 'CUSTOMER_DEPOSIT', ROUND(p_amount, 1), 'Credit added to customer account');

  RETURN v_sale_id;
END;
$$;

-- 5. UPDATE PURE DEPOSIT
CREATE OR REPLACE FUNCTION public.update_pure_deposit(
  p_sale_id uuid,
  p_new_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update Sale
  UPDATE public.sales
  SET amount_paid = ROUND(p_new_amount, 1),
      balance_due = -ROUND(p_new_amount, 1)
  WHERE id = p_sale_id AND (notes ILIKE '%Pure Deposit%' OR total_amount = 0);

  -- Update Journal Entries
  UPDATE public.journal_entries
  SET debit = ROUND(p_new_amount, 1)
  WHERE sale_id = p_sale_id AND account_type != 'CUSTOMER_DEPOSIT';

  UPDATE public.journal_entries
  SET credit = ROUND(p_new_amount, 1)
  WHERE sale_id = p_sale_id AND account_type = 'CUSTOMER_DEPOSIT';
END;
$$;

-- 6. DELETE PURE DEPOSIT
CREATE OR REPLACE FUNCTION public.delete_pure_deposit(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete Journal Entries
  DELETE FROM public.journal_entries WHERE sale_id = p_sale_id;
  -- Delete Sale
  DELETE FROM public.sales WHERE id = p_sale_id AND (notes ILIKE '%Pure Deposit%' OR total_amount = 0);
END;
$$;
