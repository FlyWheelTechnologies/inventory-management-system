-- ============================================================
-- FLYWHEEL IMS — SUPABASE NUCLEAR RESET
-- Run this ENTIRE script in Supabase SQL Editor to start fresh.
-- WARNING: This drops all existing tables and data.
-- ============================================================

-- ── 1. DROP EVERYTHING ──────────────────────────────────────
DROP VIEW  IF EXISTS public.debtors;
DROP TABLE IF EXISTS public.sale_items    CASCADE;
DROP TABLE IF EXISTS public.sales         CASCADE;
DROP TABLE IF EXISTS public.expenses      CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.products      CASCADE;
DROP TABLE IF EXISTS public.customers     CASCADE;
DROP TABLE IF EXISTS public.profiles      CASCADE;
DROP TABLE IF EXISTS public.logs          CASCADE;
DROP FUNCTION IF EXISTS public.record_sale_transaction(uuid, numeric, numeric, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.record_sale_transaction(integer, numeric, numeric, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.has_role(text[]);
DROP FUNCTION IF EXISTS public.has_role(text);

-- ── 2. HELPER FUNCTION ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 3. PROFILES TABLE ───────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT,
  full_name   TEXT,
  role        TEXT DEFAULT 'storekeeper'
                   CHECK (role IN ('admin', 'storekeeper', 'auditor')),
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(ARRAY['admin']));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'storekeeper')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. PRODUCTS TABLE ───────────────────────────────────────
CREATE TABLE public.products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category            TEXT DEFAULT 'General',
  buying_uom          TEXT DEFAULT 'pcs',
  selling_uom         TEXT DEFAULT 'pcs',
  conversion_factor   NUMERIC DEFAULT 1,
  cost_price          NUMERIC DEFAULT 0,
  selling_price       NUMERIC DEFAULT 0,
  stock_quantity      NUMERIC DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.has_role(ARRAY['admin']));

-- ── 5. CUSTOMERS TABLE ──────────────────────────────────────
CREATE TABLE public.customers (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  is_contractor BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin', 'storekeeper']));

-- ── 6. SALES TABLE ──────────────────────────────────────────
CREATE TABLE public.sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name  TEXT DEFAULT 'Walk-in Customer',
  attendant_email TEXT,
  total_amount   NUMERIC DEFAULT 0,
  amount_paid    NUMERIC DEFAULT 0,
  balance_due    NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'PAID' CHECK (payment_status IN ('PAID','PARTIAL','DEPOSIT','UNPAID')),
  payment_method TEXT DEFAULT 'Cash',
  notes          TEXT,
  recorded_by    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin']));

-- ── 7. SALE ITEMS TABLE ─────────────────────────────────────
CREATE TABLE public.sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity     NUMERIC,
  unit_price   NUMERIC,
  subtotal     NUMERIC
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));

-- ── 8. EXPENSES TABLE ───────────────────────────────────────
CREATE TABLE public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  category    TEXT DEFAULT 'Misc',
  amount      NUMERIC NOT NULL,
  recorded_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));

-- ── 9. JOURNAL ENTRIES TABLE ────────────────────────────────
CREATE TABLE public.journal_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  account_type TEXT,
  debit        NUMERIC DEFAULT 0,
  credit       NUMERIC DEFAULT 0,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_select" ON public.journal_entries FOR SELECT TO authenticated USING (public.has_role(ARRAY['admin', 'auditor']));
CREATE POLICY "journal_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin', 'storekeeper']));

-- ── 10. LOGS TABLE ──────────────────────────────────────────
CREATE TABLE public.logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT,
  user_role   TEXT,                    -- role at time of action for audit trail
  action      TEXT,
  details     TEXT,
  ip_address  TEXT,                    -- populated by Edge Functions if needed
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select" ON public.logs FOR SELECT TO authenticated USING (public.has_role(ARRAY['admin']));
CREATE POLICY "logs_insert" ON public.logs FOR INSERT TO authenticated WITH CHECK (true);

-- ── 11. DEPOSITS VIEW (replaces Debtors) ────────────────────
-- Shows customers with DEPOSIT status (paid in advance, awaiting fulfillment)
CREATE VIEW public.debtors
WITH (security_invoker = true) AS
SELECT
  c.id            AS customer_id,
  c.name          AS customer_name,
  c.phone,
  SUM(s.amount_paid)                                            AS total_debt,  -- amount held as deposit
  MAX(s.created_at)                                             AS last_sale_date,
  COUNT(s.id)                                                   AS pending_sales_count
FROM public.sales s
JOIN public.customers c ON s.customer_id = c.id
WHERE s.payment_status = 'DEPOSIT'
GROUP BY c.id, c.name, c.phone;

GRANT SELECT ON public.debtors TO authenticated;

-- ── 12. RECORD SALE RPC ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_sale_transaction(
  p_customer_id    BIGINT,      -- INTEGER customer from customers table
  p_customer_name  TEXT,
  p_total_amount   NUMERIC,
  p_amount_paid    NUMERIC,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_items          JSONB,
  p_recorded_by    TEXT
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item    JSONB;
BEGIN
  INSERT INTO public.sales
    (customer_id, customer_name, total_amount, amount_paid,
     balance_due, payment_method, payment_status, recorded_by)
  VALUES
    (p_customer_id, p_customer_name, p_total_amount, p_amount_paid,
     p_total_amount - p_amount_paid, p_payment_method, p_payment_status, p_recorded_by)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC
    );
    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::NUMERIC
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 13. STORAGE — AVATARS BUCKET ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatar_view"   ON storage.objects;
CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatar_view"   ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ── 14. BOOTSTRAP: PROMOTE FIRST ADMIN ──────────────────────
-- After running this script, promote your account to admin:
-- Replace 'your@email.com' with your actual login email, then run:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE email = 'your@email.com';
--
-- To promote another user later (from admin account in app UI):
-- Use Admin → User & Roles in the sidebar.

-- ── 15. EDGE FUNCTION WEBHOOKS ───────────────────────────────
-- After deploying Edge Functions (supabase functions deploy),
-- create these webhooks in: Supabase Dashboard → Database → Webhooks
--
-- 1. send-receipt
--    Table: public.sales | Event: INSERT
--    URL: https://<project>.supabase.co/functions/v1/send-receipt
--
-- 2. send-low-stock-alert
--    Table: public.products | Event: UPDATE
--    URL: https://<project>.supabase.co/functions/v1/send-low-stock-alert
--
-- 3. notify-deposit
--    Table: public.sales | Event: INSERT
--    URL: https://<project>.supabase.co/functions/v1/notify-deposit
--
-- All webhooks need this header:
--    Authorization: Bearer <your-service-role-key>
--
-- Set these Edge Function secrets (Supabase Dashboard → Edge Functions → Secrets):
--    RESEND_API_KEY       = your Resend API key
--    APP_URL              = https://yourapp.github.io or your custom domain

-- ── 16. RELOAD SCHEMA CACHE ─────────────────────────────────
NOTIFY pgrst, 'reload schema';
