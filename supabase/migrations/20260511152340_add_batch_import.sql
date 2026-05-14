-- Function to batch import sales
CREATE OR REPLACE FUNCTION public.record_sale_transactions_batch(
  p_sales jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_sale RECORD;
  v_sale_id UUID;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Loop through each sale in the JSON array
  FOR v_sale IN SELECT * FROM pg_catalog.jsonb_array_elements(p_sales)
  LOOP
    -- Call the existing record_sale_transaction for each item
    v_sale_id := public.record_sale_transaction(
      (v_sale.value->>'p_customer_id')::integer,
      (v_sale.value->>'p_customer_name')::text,
      (v_sale.value->>'p_total_amount')::numeric,
      (v_sale.value->>'p_amount_paid')::numeric,
      (v_sale.value->>'p_payment_method')::text,
      (v_sale.value->>'p_payment_status')::text,
      (v_sale.value->'p_items')::jsonb,
      (v_sale.value->>'p_recorded_by')::text,
      COALESCE((v_sale.value->>'p_tax_percentage')::numeric, 0),
      COALESCE((v_sale.value->>'p_tax_inclusive')::boolean, TRUE),
      COALESCE((v_sale.value->>'p_credit_used')::numeric, 0)
    );

    -- Append result
    v_results := v_results || pg_catalog.jsonb_build_object('sale_id', v_sale_id);
  END LOOP;

  RETURN v_results;
END;
$function$;
