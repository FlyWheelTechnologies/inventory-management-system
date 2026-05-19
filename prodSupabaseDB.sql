-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.customers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  is_contractor boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text DEFAULT 'Misc'::text,
  amount numeric NOT NULL,
  recorded_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid,
  account_type text,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entries_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id)
);
CREATE TABLE public.logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email text,
  user_role text,
  action text,
  details text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'General'::text,
  buying_uom text DEFAULT 'pcs'::text,
  selling_uom text DEFAULT 'pcs'::text,
  conversion_factor numeric DEFAULT 1,
  cost_price numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  stock_quantity numeric DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  item_code text,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'storekeeper'::text CHECK (role = ANY (ARRAY['admin'::text, 'storekeeper'::text, 'auditor'::text])),
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid,
  product_id uuid,
  product_name text,
  quantity numeric,
  unit_price numeric,
  subtotal numeric,
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id bigint,
  customer_name text DEFAULT 'Walk-in Customer'::text,
  attendant_email text,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  payment_status text DEFAULT 'PAID'::text CHECK (payment_status = ANY (ARRAY['PAID'::text, 'PARTIAL'::text, 'DEPOSIT'::text, 'UNPAID'::text])),
  payment_method text DEFAULT 'Cash'::text,
  notes text,
  recorded_by text,
  created_at timestamp with time zone DEFAULT now(),
  invoice_no bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tax_percentage numeric DEFAULT 0,
  tax_inclusive boolean DEFAULT true,
  tax_amount numeric DEFAULT 0,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);