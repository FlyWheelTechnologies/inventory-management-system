-- 1. Add product_name to sale_items table
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 2. Update record_sale_transaction to include product_name
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
  IF p_tax_inclusive THEN
    v_net_amount := p_total_amount / (1 + (p_tax_percentage / 100));
    v_tax_amount := p_total_amount - v_net_amount;
    v_total_with_tax := p_total_amount;
  ELSE
    v_tax_amount := p_total_amount * (p_tax_percentage / 100);
    v_net_amount := p_total_amount;
    v_total_with_tax := p_total_amount + v_tax_amount;
  END IF;

  INSERT INTO public.sales (
    customer_id, customer_name, total_amount, amount_paid, 
    balance_due, payment_status, payment_method, recorded_by,
    tax_percentage, tax_inclusive, tax_amount
  )
  VALUES (
    p_customer_id, p_customer_name, 
    v_total_with_tax, 
    p_amount_paid + p_credit_used, 
    v_total_with_tax - (p_amount_paid + p_credit_used),
    p_payment_status, p_payment_method, p_recorded_by,
    p_tax_percentage, p_tax_inclusive, v_tax_amount
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM pg_catalog.jsonb_to_recordset(p_items) AS x(product_id UUID, product_name TEXT, quantity NUMERIC, unit_price NUMERIC, subtotal NUMERIC)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_item.product_id, v_item.product_name, v_item.quantity, v_item.unit_price, v_item.subtotal);
    
    UPDATE public.products SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- Journaling
  INSERT INTO public.journal_entries (sale_id, account_type, credit, description) 
  VALUES (v_sale_id, 'REVENUE', v_net_amount, 'Revenue from Sale #' || v_sale_id);
  
  IF v_tax_amount > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, credit, description) 
    VALUES (v_sale_id, 'TAX_PAYABLE', v_tax_amount, 'Tax collected (' || p_tax_percentage || '%)');
  END IF;
  
  IF p_amount_paid > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, pg_catalog.upper(p_payment_method), p_amount_paid, 'Cash/Momo payment received');
  END IF;

  IF p_credit_used > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, 'CUSTOMER_DEPOSIT', p_credit_used, 'Applied from customer credit');
  END IF;
  
  IF (v_total_with_tax - (p_amount_paid + p_credit_used)) > 0 THEN
    INSERT INTO public.journal_entries (sale_id, account_type, debit, description) 
    VALUES (v_sale_id, 'ACCOUNTS_RECEIVABLE', (v_total_with_tax - (p_amount_paid + p_credit_used)), 'Debt recorded');
  END IF;

  RETURN v_sale_id;
END;
$function$;

-- Function to fulfill a deposit sale
CREATE OR REPLACE FUNCTION public.fulfill_sale(p_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $$
BEGIN
  UPDATE public.sales
  SET payment_status = CASE WHEN balance_due <= 0 THEN 'PAID' ELSE 'PARTIAL' END
  WHERE id = p_sale_id AND payment_status = 'DEPOSIT';
END;
$$;
